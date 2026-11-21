import type { Node as MdAstNode, Nodes, Parent, RootContent, Root, Text } from 'mdast'
import { findAndReplace } from 'mdast-util-find-and-replace'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { mathFromMarkdown } from 'mdast-util-math'
import { gfm } from 'micromark-extension-gfm'
import { math } from 'micromark-extension-llm-math'
import type { Source } from '../chat/view.js'

/** 正文里的 [citation:N]，已换成对应来源 */
export interface CitationNode extends MdAstNode {
  type: 'citation'
  source: Source
}

declare module 'mdast' {
  interface RootContentMap {
    citation: CitationNode
  }

  interface PhrasingContentMap {
    citation: CitationNode
  }
}

const text = (value: string): Text => ({ type: 'text', value })

const FENCE_START = /^ {0,3}(`{3,}|~{3,})/
const ENV_NAME = /^([a-zA-Z*]+)\}/

/**
 * 模型经常用 LaTeX 的 \[...\]、\(...\)，甚至裸的 \begin{aligned}...\end{aligned}
 * 写公式，而解析器只认 $ 和 $$，这些写法会被当成普通文字显示。
 * 这里先把定界符统一成美元符号；代码块、行内代码和已有公式原样跳过。
 */
/** 取出这一行开头的空白，插公式时保持列表缩进，避免把列表拆开 */
const indentOf = (input: string, index: number): string => {
  const lineStart = input.lastIndexOf('\n', index - 1) + 1
  return /^[ \t]*/.exec(input.slice(lineStart, index))?.[0] ?? ''
}

/** 生成一段独立的 $$ 公式块，每行带上同样的缩进 */
const block = (body: string, indent: string): string => {
  const lines = body
    .split('\n')
    .map((line) => (line.startsWith(indent) ? line : indent + line))
    .join('\n')
  return `\n\n${indent}$$\n${lines}\n${indent}$$\n\n`
}

export const normalizeMath = (input: string): string => {
  const n = input.length
  let out = ''
  let i = 0
  let lineStart = true

  while (i < n) {
    // 行首的围栏代码块：整段原样保留，直到同种标记收尾
    if (lineStart) {
      const fence = FENCE_START.exec(input.slice(i, i + 16))
      if (fence) {
        const marker = fence[1]
        const start = i
        let eol = input.indexOf('\n', i)
        let next = eol < 0 ? n : eol + 1
        while (eol >= 0 && next < n) {
          eol = input.indexOf('\n', next)
          const line = input.slice(next, eol < 0 ? n : eol)
          next = eol < 0 ? n : eol + 1
          if (line.trimStart().startsWith(marker)) {
            break
          }
        }
        out += input.slice(start, next)
        i = next
        continue
      }
    }

    const ch = input[i]

    // 行内代码、已有公式：整段原样保留
    if (ch === '`' || ch === '$') {
      let len = 1
      if (ch === '$' && input[i + 1] === '$') {
        len = 2
      } else if (ch === '`') {
        while (input[i + len] === '`') len += 1
      }
      const marker = input.slice(i, i + len)
      const close = input.indexOf(marker, i + len)
      if (close < 0) {
        out += input.slice(i)
        break
      }
      out += input.slice(i, close + len)
      i = close + len
      lineStart = false
      continue
    }

    // \[ ... \] → $$ ... $$
    if (ch === '\\' && input[i + 1] === '[') {
      const close = input.indexOf('\\]', i + 2)
      if (close >= 0) {
        out += block(input.slice(i + 2, close).trim(), indentOf(input, i))
        i = close + 2
        lineStart = false
        continue
      }
    }

    // \( ... \) → $ ... $
    if (ch === '\\' && input[i + 1] === '(') {
      const close = input.indexOf('\\)', i + 2)
      if (close >= 0) {
        out += `$${input.slice(i + 2, close).trim()}$`
        i = close + 2
        lineStart = false
        continue
      }
    }

    // 裸的公式环境：\begin{aligned} ... \end{aligned}
    if (ch === '\\' && input.startsWith('\\begin{', i)) {
      const name = ENV_NAME.exec(input.slice(i + 7, i + 40))
      if (name) {
        const end = `\\end{${name[1]}}`
        const close = input.indexOf(end, i)
        if (close >= 0) {
          const indent = indentOf(input, i)
          const body = input.slice(i, close + end.length)
          out += block(body, indent)
          i = close + end.length
          lineStart = false
          continue
        }
      }
    }

    out += ch
    lineStart = ch === '\n'
    i += 1
  }
  return out
}

/**
 * 解析正文，并把渲染器不单独处理的节点提前换掉，渲染时无需再读原文：
 * - 传入 sources 时，[citation:N] 换成角标节点，找不到来源的直接去掉
 * - disableLink 时链接只保留文字
 * - 删除线保留原样的 ~ 定界符，脚注、引用式链接与定义显示原文
 */
export function toMdAst(
  input: string,
  { sources, disableLink }: { sources: Source[] | undefined; disableLink: boolean }
): Root {
  // 位置信息基于归一化后的文本，下面取原文切片也要用它
  const source = normalizeMath(input)
  const ast = fromMarkdown(source, {
    extensions: [
      // codeIndented 语法导致有前导空格的列表无法正常渲染
      { ...gfm(), disable: { null: ['codeIndented'] } },
      math({ singleDollarTextMath: true }),
    ],
    mdastExtensions: [gfmFromMarkdown(), mathFromMarkdown()],
  })
  if (sources) {
    const sourcesByIndex = new Map(sources.map((source) => [source.index, source]))
    findAndReplace(
      ast,
      [
        /\[citation:(\d+)\]/g,
        (_: string, index: string): CitationNode | '' => {
          const source = sourcesByIndex.get(Number(index))
          return source ? { type: 'citation', source } : ''
        },
      ],
      { ignore: ['linkReference'] }
    )
  }
  const raw = (node: Nodes) => source.slice(node.position?.start.offset, node.position?.end.offset)
  // 先处理子节点，再按需把当前节点换成若干节点
  const simplify = (node: Nodes): Nodes[] => {
    if ('children' in node) {
      ;(node as Parent).children = node.children.flatMap(simplify) as RootContent[]
    }
    switch (node.type) {
      case 'link':
        return disableLink ? node.children : [node]
      case 'delete': {
        // 解析器保证首尾定界符等长
        const delimiter = raw(node).match(/^~+/)?.[0] ?? ''
        return [text(delimiter), ...node.children, text(delimiter)]
      }
      case 'footnoteReference':
      case 'imageReference':
      case 'linkReference':
        return [text(raw(node))]
      case 'footnoteDefinition':
      case 'definition':
        return [{ type: 'paragraph', children: [text(raw(node))] }]
      default:
        return [node]
    }
  }

/**
 * 把公式里写成 a/b 的分式改成 \frac{a}{b}，渲染时上下排列。
 * 只处理单个数、字母、命令、花括号组（可带上标/下标），以及整体括号；
 * 另外两个操作数都必须有括号或边界，避免把 \frac 已写好的内容拆掉。
 */
const POWER = String.raw`(?:\^\{[^{}]*\}|\^[A-Za-z0-9]|\^\\[A-Za-z]+)?`
const SIMPLE = String.raw`(?:[A-Za-z]+|[0-9]+|\{[^{}]*\}|\\[A-Za-z]+)${POWER}`
// 前面是 ^ 或 _ 时不转换：\text{Cu}^{2+}/\text{Cu} 是电极写法，不是分式
const BOUNDARY = String.raw`(?<![\\A-Za-z0-9^_])`

const PAREN_DEN = new RegExp(`${BOUNDARY}(${SIMPLE})\\s*/\\s*\\(([^()]*)\\)`, 'g')
const PAREN_NUM = new RegExp(`${BOUNDARY}\\(([^()]*)\\)\\s*/\\s*(${SIMPLE})`, 'g')
const PLAIN = new RegExp(`${BOUNDARY}(${SIMPLE})\\s*/\\s*(${SIMPLE})(?![A-Za-z0-9])`, 'g')

/** KaTeX 不允许 \text{} 里用 \frac，模型却常这么写单位；这里改成 a/b */
const TEXT_FRAC = new RegExp(String.raw`\\text\{\s*\\frac\{([^{}]*)\}\{([^{}]*)\}\s*\}`, 'g')
const fixTextFraction = (value: string): string => value.replace(TEXT_FRAC, '\\text{$1/$2}')

/** KaTeX 不支持的常用 LaTeX 命令，换成等效写法 */
const TEX_ALIASES: Array<[RegExp, string]> = [
  [/\\cdotp(?![A-Za-z])/g, '\\cdot'],
  [/\\ldotp(?![A-Za-z])/g, '\\cdot'],
  [/\\varDelta(?![A-Za-z])/g, '\\Delta'],
  [/\\varTheta(?![A-Za-z])/g, '\\Theta'],
]
const applyTexAliases = (value: string): string =>
  TEX_ALIASES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value)

const stackFractions = (value: string): string => {
  let current = value
  for (let guard = 0; guard < 20; guard += 1) {
    const next = current
      .replace(PAREN_DEN, '\\frac{$1}{$2}')
      .replace(PAREN_NUM, '\\frac{$1}{$2}')
      .replace(PLAIN, '\\frac{$1}{$2}')
    if (next === current) {
      break
    }
    current = next
  }
  // 最后再处理 \text 里的分数，避免又被上面的规则转回去
  return fixTextFraction(applyTexAliases(current))
}

/** 递归处理公式节点 */
const stackMathInAst = (node: Nodes): void => {
  if (node.type === 'math' || node.type === 'inlineMath') {
    node.value = stackFractions(node.value)
    return
  }
  if ('children' in node) {
    for (const child of (node as Parent).children) {
      stackMathInAst(child as Nodes)
    }
  }
}

  simplify(ast)
  stackMathInAst(ast)
  return ast
}
