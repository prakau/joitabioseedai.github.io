package com.joitabioseedai.farmassist;

import static org.junit.Assert.*;
import android.graphics.Bitmap;
import android.os.SystemClock;
import android.util.Base64;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class FarmAssistTest {
    private String js(ActivityScenario<MainActivity> scenario, String expression) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(expression, result -> {
            value.set(result); done.countDown();
        }));
        assertTrue("WebView callback timed out", done.await(10, TimeUnit.SECONDS));
        return value.get();
    }
    private void until(ActivityScenario<MainActivity> scenario, String expression) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 45000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if ("true".equals(js(scenario, expression))) return;
            SystemClock.sleep(250);
        }
        fail("Timed out: " + expression + "\n" + js(scenario, "document.body.innerText.slice(-3000)"));
    }
    private void ready(ActivityScenario<MainActivity> scenario) throws Exception {
        until(scenario, "Boolean(document.querySelector('.app-brand')) && Boolean(window.Capacitor?.isNativePlatform())");
        assertEquals("true", js(scenario, "window.Capacitor.isNativePlatform()"));
        assertEquals("\"https://localhost\"", js(scenario, "location.origin"));
    }
    private void reload(ActivityScenario<MainActivity> scenario) throws Exception {
        js(scenario, "window.reloadMarker=true");
        scenario.onActivity(activity -> activity.getBridge().getWebView().reload());
        until(scenario, "!window.reloadMarker && Boolean(document.querySelector('.app-brand')) && Boolean(window.Capacitor?.isNativePlatform())");
        ready(scenario);
    }
    private void screenshot(String name) throws Exception {
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        SystemClock.sleep(500);
        File dir = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null), "qa");
        dir.mkdirs();
        Bitmap bitmap = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        if (bitmap != null) try (FileOutputStream out = new FileOutputStream(new File(dir, name + ".png"))) {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
        }
    }
    @Test public void bundledToolsWorkWithoutNetwork() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            ready(scenario);
            scenario.onActivity(activity -> {
                activity.getBridge().getWebView().getSettings().setBlockNetworkLoads(true);
                activity.getBridge().getWebView().setNetworkAvailable(false);
            });
            until(scenario, "document.body.innerText.includes('Device offline')");
            js(scenario, "localStorage.setItem('joita-native-test', 'persisted');location.hash='#/calculators'");
            until(scenario, "document.title.startsWith('Calculators |')");
            assertEquals("true", js(scenario, "document.body.innerText.includes('Field area')"));
            for (String route : new String[]{"calendar", "ledger", "soil", "visualizer", "settings", "home"}) {
                js(scenario, "location.hash='#/" + (route.equals("home") ? "" : route) + "'");
                until(scenario, "Boolean(document.querySelector('.app-sidebar a.active[href=\"#/" + (route.equals("home") ? "" : route) + "\"]'))");
                assertEquals("true", js(scenario, "document.documentElement.scrollWidth <= innerWidth"));
            }
            reload(scenario);
            assertEquals("\"persisted\"", js(scenario, "localStorage.getItem('joita-native-test')"));
            screenshot("android-offline-home");
            js(scenario, "document.querySelector('.interface-options button[lang=hi]').click()");
            until(scenario, "document.documentElement.lang === 'hi' && document.body.innerText.includes('बेहतर खेती। सही अगला कदम।')");
            assertEquals("true", js(scenario, "document.documentElement.scrollWidth <= innerWidth"));
            reload(scenario);
            until(scenario, "document.documentElement.lang === 'hi'");
            screenshot("android-hindi-dashboard");
            js(scenario, "document.querySelector('.interface-options button[lang=en]').click()");
            until(scenario, "document.documentElement.lang === 'en'");
            scenario.onActivity(activity -> {
                activity.getBridge().getWebView().getSettings().setBlockNetworkLoads(false);
                activity.getBridge().getWebView().setNetworkAvailable(true);
            });
        }
    }
    @Test public void realProductionServicesWorkFromNativeOrigin() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            ready(scenario);
            js(scenario, "window.nativeCheck=null;fetch('https://www.joitabioseedai.com/api/health').then(r=>r.json()).then(d=>window.nativeCheck=d).catch(e=>window.nativeCheck={error:String(e)})");
            until(scenario, "Boolean(window.nativeCheck)");
            assertEquals("true", js(scenario, "window.nativeCheck.ok && window.nativeCheck.hasGeminiKey && window.nativeCheck.hasMarketKey && window.nativeCheck.hasSpeechKey"));
            js(scenario, "location.hash='#/'");
            until(scenario, "Boolean(document.querySelector('#field-question'))");
            js(scenario, "(()=>{const input=document.querySelector('#field-question');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'tamatar ke patte peele ho rahe hain kya karu');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
            js(scenario, "document.querySelector('#field-question').form.requestSubmit()");
            until(scenario, "Boolean(document.querySelector('.advisory-result'))");
            assertEquals("true", js(scenario, "document.querySelector('.advisory-result').innerText.includes('JOITA Live AI')"));
            assertEquals("true", js(scenario, "document.querySelector('.answer-copy').lang === 'hi-IN'"));
            js(scenario, "document.querySelector('[aria-label=\"Read answer aloud\"]').click()");
            until(scenario, "Boolean(document.querySelector('audio')) && document.querySelector('audio').duration > 0");
            screenshot("android-live-advisory");
            js(scenario, "document.querySelector('[aria-label=\"Stop reading\"]').click();location.hash='#/market'");
            until(scenario, "Boolean(document.querySelector('tbody tr')) || document.body.innerText.includes('No published prices')");
            assertEquals("true", js(scenario, "document.body.innerText.includes('AGMARKNET / Data.gov.in: live')"));
            screenshot("android-market");
        }
    }
    @Test public void photoAdvisoryAndHindiSafetyRules() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            ready(scenario);
            js(scenario, "location.hash='#/diagnose'");
            until(scenario, "Boolean(document.querySelector('input[aria-label=\"Crop photo (optional)\"]'))");
            byte[] bytes = InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("tomato-leaf.jpg").readAllBytes();
            String data = Base64.encodeToString(bytes, Base64.NO_WRAP);
            js(scenario, "(()=>{const file=new File([Uint8Array.from(atob('" + data + "'),c=>c.charCodeAt(0))],'tomato.jpg',{type:'image/jpeg'});const transfer=new DataTransfer();transfer.items.add(file);const input=document.querySelector('input[aria-label=\"Crop photo (optional)\"]');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()");
            until(scenario, "Boolean(document.querySelector('.photo-preview img'))");
            js(scenario, "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Analyze crop').click()");
            until(scenario, "Boolean(document.querySelector('.advisory-result'))");
            assertEquals("true", js(scenario, "document.querySelector('.advisory-result').innerText.includes('JOITA Live AI') && document.querySelector('.answer-copy').lang === 'hi-IN' && document.querySelector('.advisory-result').innerText.includes('फोटो पर आधारित')"));
            assertEquals("false", js(scenario, "document.body.innerText.includes('Gemini')"));
            js(scenario, "document.querySelector('.advisory-result').scrollIntoView({block:'center',behavior:'instant'})");
            screenshot("android-hindi-photo-advisory");
            js(scenario, "window.policyCheck=null;fetch('https://www.joitabioseedai.com/api/farmassist-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'कीटनाशक की कितनी मात्रा मिलाएं?',language:'Hindi'})}).then(r=>r.json()).then(d=>window.policyCheck=d)");
            until(scenario, "Boolean(window.policyCheck)");
            assertEquals("true", js(scenario, "window.policyCheck.source==='joita_rules' && window.policyCheck.language==='Hindi'"));
        }
    }
}
