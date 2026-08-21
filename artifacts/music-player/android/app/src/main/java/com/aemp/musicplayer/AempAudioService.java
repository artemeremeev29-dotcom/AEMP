package com.aemp.musicplayer;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

public class AempAudioService extends Service {

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
