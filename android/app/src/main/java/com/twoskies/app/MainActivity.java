package com.twoskies.app;

import android.graphics.Color;
import android.os.Bundle;

import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 天空全幅延伸到系統列後面；內容避讓交給 @capacitor-community/safe-area。
        // SystemBarStyle.dark = 透明底、亮色圖示——這個 app 的天空即使白晝也配白字
        EdgeToEdge.enable(
            this,
            SystemBarStyle.dark(Color.TRANSPARENT),
            SystemBarStyle.dark(Color.TRANSPARENT)
        );
    }
}
