package com.loop.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();

        // Force WebView to reload the latest content and prevent stale cache issues
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();

                // Use LOAD_NO_CACHE to always fetch latest from the Vercel deployment
                // This prevents the infinite loading bug caused by stale cached HTML/JS
                settings.setCacheMode(WebSettings.LOAD_NO_CACHE);

                // Enable DOM storage (required for localStorage-based auth persistence)
                settings.setDomStorageEnabled(true);

                // Enable JavaScript (should already be on, but ensure it)
                settings.setJavaScriptEnabled(true);

                // Allow mixed content for development; disable for strict production
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

                // Optimize rendering
                settings.setRenderPriority(WebSettings.RenderPriority.HIGH);

                // Disable file access for security
                settings.setAllowFileAccessFromFileURLs(false);
                settings.setAllowUniversalAccessFromFileURLs(false);
            }
        } catch (Exception e) {
            // Fail silently — WebView might not be ready yet
            android.util.Log.e("LoopApp", "WebView settings error on resume: " + e.getMessage());
        }
    }
}
