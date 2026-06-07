package com.tgramdrive.tv

import android.content.Context
import android.content.SharedPreferences
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintLayout
import java.net.URL

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var loadingText: TextView
    private lateinit var configOverlay: ConstraintLayout
    private lateinit var etServerUrl: EditText
    private lateinit var btnSave: Button

    private lateinit var sharedPreferences: SharedPreferences
    private val PREFS_NAME = "TGramDriveTVPrefs"
    private val KEY_SERVER_URL = "server_url"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Bind Views
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        loadingText = findViewById(R.id.loadingText)
        configOverlay = findViewById(R.id.configOverlay)
        etServerUrl = findViewById(R.id.etServerUrl)
        btnSave = findViewById(R.id.btnSave)

        sharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Setup URL Config Controls
        btnSave.setOnClickListener {
            saveAndConnect()
        }

        // Initialize WebView settings
        setupWebView()

        // Check if server URL is configured, defaulting to tgdrive.kiranv.in
        var savedUrl = sharedPreferences.getString(KEY_SERVER_URL, null)
        if (savedUrl.isNullOrEmpty()) {
            savedUrl = "https://tgdrive.kiranv.in"
            sharedPreferences.edit().putString(KEY_SERVER_URL, savedUrl).apply()
        }
        loadServerUrl(savedUrl)
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        
        // Use a customized user agent so the server can optimize UI for TV
        val defaultUserAgent = settings.userAgentString
        settings.userAgentString = "$defaultUserAgent TGramDriveTV/1.0.0 AndroidTV"

        // Handle cookies
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.webChromeClient = object : WebChromeClient() {
            // Keep WebChromeClient for standard browser dialogs/console logging
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                
                // Hide loading spinner and show WebView
                progressBar.visibility = View.GONE
                loadingText.visibility = View.GONE
                webView.visibility = View.VISIBLE

                // Inject Spatial Navigation JavaScript helper
                injectSpatialNavigation()
            }

            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                // Ensure link clicks stay inside the WebView
                return false
            }
        }
    }

    private fun showConfigScreen() {
        progressBar.visibility = View.GONE
        loadingText.visibility = View.GONE
        webView.visibility = View.GONE
        configOverlay.visibility = View.VISIBLE
        etServerUrl.requestFocus()
    }

    private fun saveAndConnect() {
        var inputUrl = etServerUrl.text.toString().trim()
        if (inputUrl.isEmpty()) {
            etServerUrl.error = getString(R.string.error_invalid_url)
            return
        }

        // Prepend schema if user forgot it
        if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://")) {
            inputUrl = "http://$inputUrl"
        }

        try {
            // Validate URL format
            URL(inputUrl)
            
            // Save to shared preferences
            sharedPreferences.edit().putString(KEY_SERVER_URL, inputUrl).apply()
            
            // Hide config and load
            configOverlay.visibility = View.GONE
            loadServerUrl(inputUrl)
        } catch (e: Exception) {
            etServerUrl.error = getString(R.string.error_invalid_url)
        }
    }

    private fun loadServerUrl(url: String) {
        progressBar.visibility = View.VISIBLE
        loadingText.visibility = View.VISIBLE
        webView.visibility = View.GONE
        configOverlay.visibility = View.GONE
        
        Log.d("MainActivity", "Loading server URL: $url")
        webView.loadUrl(url)
    }

    private fun injectSpatialNavigation() {
        try {
            val inputStream = assets.open("spatial_navigation.js")
            val size = inputStream.available()
            val buffer = ByteArray(size)
            inputStream.read(buffer)
            inputStream.close()
            
            val jsContent = String(buffer, Charsets.UTF_8)
            webView.evaluateJavascript(jsContent, null)
            Log.d("MainActivity", "Successfully injected spatial_navigation.js")
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to load spatial_navigation.js from assets", e)
        }
    }

    // Capture standard TV Remote key presses
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // Handle BACK key to navigate back in WebView history
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView.visibility == View.VISIBLE && webView.canGoBack()) {
                webView.goBack()
                return true
            } else if (configOverlay.visibility == View.VISIBLE) {
                // If on setup screen and there was a previously saved URL, let them go back to it
                val savedUrl = sharedPreferences.getString(KEY_SERVER_URL, null)
                if (!savedUrl.isNullOrEmpty()) {
                    configOverlay.visibility = View.GONE
                    loadServerUrl(savedUrl)
                    return true
                }
            } else if (webView.visibility == View.VISIBLE) {
                // If at root of web app, double back to open settings overlay again
                showConfigScreen()
                Toast.makeText(this, "Press BACK again to exit app", Toast.LENGTH_SHORT).show()
                return true
            }
        }
        
        // Fall back to standard key handling (arrow keys are automatically forwarded to WebView)
        return super.onKeyDown(keyCode, event)
    }
}
