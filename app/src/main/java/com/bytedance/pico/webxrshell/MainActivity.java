package com.bytedance.pico.webxrshell;

import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
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
  // Here we can make some initial configurations for the container, such as
  // setting controller models.
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    setControllers();
  }

  // Here we can make some initial configurations for the WebView.
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

  // The loading bitmap configurations are made here. You should provide the
  // related Context, Splash icon id and title to the `LoadingInfo`, then use
  // `LoadingPicMaker` to generate the final pictures.
  @Override
  public Bitmap[] loadWebXRLoadingBitmaps() {
    LoadingInfo envInfo = new LoadingInfo();
    envInfo.setContext(this);
    envInfo.setSplashIconId(R.drawable.webxr_shell);
    envInfo.setSplashTitle("WebXRShell");
    LoadingPicMaker lp = new LoadingPicMaker(envInfo);
    return lp.generateLoadingBitmaps();
  }

  // Configure whether to enable the experimental Navigation feature.
  @Override
  public boolean enableExperimentalNavigation() {
    return true;
  }

  // Configure where to layout the WebView. The parameters of XRPosition are
  // (width, height, translate_x, translate_y, translate_z, scale_x, scale_y,
  // scale_z).
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

  private void setControllers() {
    final String CONTROLLER_PATH_PREFIX = "file:///android_asset/controllers/";
    final String PICO_NEO3_PATH = "vr_controller_piconeo3";
    final String PICO4_PATH = "vr_controller_pico4";
    final String OCULUS_QUEST_PATH = "vr_controller_oculusquest";
    final String OCULUS_QUEST2_PATH = "vr_controller_oculusquest2";
    final String LEFT_PATH = "_left";
    final String RIGHT_PATH = "_right";
    final String CONTROLLER_PATH_SUFFIX = ".obj";
    final String PICO_NEO3_DEVICE = "PICOA7H10";
    final String PICO4_DEVICE = "PICOA8110";

    String vendorPath = "";
    float controllerScale = 0.01f;
    if (PICO_NEO3_DEVICE.equals(Build.DEVICE)) {
      vendorPath = PICO_NEO3_PATH;
    } else if (PICO4_DEVICE.equals(Build.DEVICE)) {
      vendorPath = PICO4_PATH;
    } else if ("oculus".equals(Build.BRAND)) {
      // TODO: Get oculus devices' info to determine which controller to use.
      vendorPath = OCULUS_QUEST_PATH;
      controllerScale = 1f;
    }
    String leftControllerPath = CONTROLLER_PATH_PREFIX + vendorPath +
                                LEFT_PATH + CONTROLLER_PATH_SUFFIX;
    String rightControllerPath = CONTROLLER_PATH_PREFIX + vendorPath +
                                 RIGHT_PATH + CONTROLLER_PATH_SUFFIX;

    setControllers(leftControllerPath, rightControllerPath, controllerScale);
  }
}
