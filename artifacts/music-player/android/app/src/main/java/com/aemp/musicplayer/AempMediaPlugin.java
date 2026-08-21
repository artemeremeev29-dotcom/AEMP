package com.aemp.musicplayer;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "AempMedia")
public class AempMediaPlugin extends Plugin {

    @PluginMethod
    public void startPlaybackService(PluginCall call) {
        Intent intent = new Intent(getContext(), AempAudioService.class);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        JSObject result = new JSObject();
        result.put("started", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopPlaybackService(PluginCall call) {
        Intent intent = new Intent(getContext(), AempAudioService.class);
        getContext().stopService(intent);

        JSObject result = new JSObject();
        result.put("stopped", true);
        call.resolve(result);
    }
}
