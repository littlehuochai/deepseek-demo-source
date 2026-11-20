package app.dsh.deepseekdemo;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_CODE = 1001;

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString() + " DSHDeepSeekDemo/1.1");
        CookieManager.getInstance().setAcceptCookie(true);
        web.setWebViewClient(new WebViewClient());

        // 文件选择：网页里的 <input type="file"> 需要宿主打开系统选择器
        web.setWebChromeClient(
                new WebChromeClient() {
                    @Override
                    public boolean onShowFileChooser(
                            WebView view,
                            ValueCallback<Uri[]> callback,
                            FileChooserParams params) {
                        if (fileCallback != null) {
                            fileCallback.onReceiveValue(null);
                        }
                        fileCallback = callback;
                        try {
                            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                            intent.addCategory(Intent.CATEGORY_OPENABLE);
                            intent.setType("*/*");
                            if (params != null && params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                            }
                            String[] accept = params == null ? null : params.getAcceptTypes();
                            if (accept != null && accept.length == 1 && accept[0] != null
                                    && accept[0].contains("/") && !accept[0].contains(",")) {
                                intent.setType(accept[0]);
                            }
                            startActivityForResult(Intent.createChooser(intent, "选择文件"), FILE_CHOOSER_CODE);
                            return true;
                        } catch (Exception error) {
                            fileCallback = null;
                            return false;
                        }
                    }
                });

        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_CODE) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    result = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        result[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    result = new Uri[] { data.getData() };
                }
            }
            if (fileCallback != null) {
                fileCallback.onReceiveValue(result);
                fileCallback = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web != null && web.canGoBack()) {
            web.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
