/**
 * 点开聊天里的图片时用全屏遮罩显示，不做页面跳转。
 * 原先图片是 <a href="blob:...">，在浏览器/WebView 里跳转会离开当前对话。
 */
const show = (url: string) => {
  const overlay = document.createElement('div')
  overlay.setAttribute('role', 'dialog')
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.92);' +
    'display:flex;align-items:center;justify-content:center;padding:12px;'
  const image = document.createElement('img')
  image.src = url
  image.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;'
  overlay.appendChild(image)

  const close = () => {
    overlay.remove()
    document.removeEventListener('keydown', onKey)
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close()
    }
  }
  overlay.addEventListener('click', close)
  document.addEventListener('keydown', onKey)
  document.body.appendChild(overlay)
}

/** 只在 App 入口调用一次 */
export const installImageLightbox = () => {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest?.('a') as HTMLAnchorElement | null
      const href = anchor?.getAttribute('href') ?? ''
      if (!href.startsWith('blob:') && !href.startsWith('data:image')) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      show(href)
    },
    true
  )
}
