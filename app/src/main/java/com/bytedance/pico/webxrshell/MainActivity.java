package com.bytedance.pico.webxrshell;

import android.graphics.Bitmap;
import android.text.TextUtils;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.bytedance.webxr.launcher.LoadingInfo;
import com.bytedance.webxr.launcher.LoadingPicMaker;
import com.bytedance.webxr.launcher.WebViewSettingUtils;
import com.bytedance.webxr.launcher.WebXRActivity;
import com.bytedance.webxr.launcher.XRPosition;
import java.io.IOException;
import java.util.Collections;
import java.util.Objects;

public class MainActivity extends WebXRActivity {
  @Override
  public void onInitWebXR(@NonNull WebView webView) {
    WebView.setWebContentsDebuggingEnabled(true);
    WebViewSettingUtils.setUsualSettings(Objects.requireNonNull(webView));
    webView.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(
          WebView view, WebResourceRequest request) {
        String scheme = request.getUrl().getScheme();
        if (!"https".equals(scheme) && !"http".equals(scheme) ||
            !"webxr-samples.local".equals(request.getUrl().getHost())) {
          return null;
        }
        try {
          String path = request.getUrl().getPath();
          String mimeType = getMimeType(request.getUrl().toString());
          if (!TextUtils.isEmpty(path)) {
            String pathInAssets = "webxr-samples" + path;
            return new WebResourceResponse(mimeType, "", 200, "ok",
                                           Collections.emptyMap(),
                                           getAssets().open(pathInAssets));
          }
        } catch (IOException e) {
          e.printStackTrace();
        }
        return null;
      }
    });
    webView.loadUrl(
        "https://webxr-samples.local/tests/navigation/immersive-vr-session.html");
  }

  @Override
  public Bitmap[] loadWebXRLoadingBitmaps() {
    LoadingInfo envInfo = new LoadingInfo();
    envInfo.setContext(this);
    envInfo.setSplashIconId(R.drawable.webxr_shell);
    envInfo.setSplashTitle("WebXRShell");
    LoadingPicMaker lp = new LoadingPicMaker(envInfo);
    return lp.generateLoadingBitmaps();
  }

  @Override
  public boolean enableExperimentalNavigation() {
    return true;
  }

  @Override
  public XRPosition onLayout() {
    return new XRPosition(2160, 2160, 0, -0.2f, -0.5f, 1, 1, 1);
  }

  private static String getMimeType(@Nullable String url) {
    String type = null;
    String extension = MimeTypeMap.getFileExtensionFromUrl(url);
    if (extension != null) {
      type = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
    }
    return type;
  }
}