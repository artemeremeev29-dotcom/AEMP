package com.aemp.musicplayer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class AempAudioService extends Service {

    public static final String ACTION_UPDATE_METADATA =
            "com.aemp.musicplayer.UPDATE_METADATA";

    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";

    private static final String CHANNEL_ID = "aemp_playback";
    private static final int NOTIFICATION_ID = 1001;

    private String currentTitle = "AEMP";
    private String currentArtist = "AEMP";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, buildNotification());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {

        if (intent != null) {
            String action = intent.getAction();

            if (ACTION_UPDATE_METADATA.equals(action)) {
                currentTitle = intent.getStringExtra(EXTRA_TITLE);
                currentArtist = intent.getStringExtra(EXTRA_ARTIST);

                if (currentTitle == null) {
                    currentTitle = "AEMP";
                }

                if (currentArtist == null) {
                    currentArtist = "AEMP";
                }

                updateNotification();
            }
        }

        return START_STICKY;
    }

    private Notification buildNotification() {

        Intent launchIntent = getPackageManager()
                .getLaunchIntentForPackage(getPackageName());

        PendingIntent contentIntent = null;

        if (launchIntent != null) {
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            contentIntent = PendingIntent.getActivity(
                    this,
                    0,
                    launchIntent,
                    flags
            );
        }

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(this, CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.ic_media_play)
                        .setContentTitle(currentTitle)
                        .setContentText(currentArtist)
                        .setOngoing(true)
                        .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                        .setPriority(NotificationCompat.PRIORITY_LOW);

        if (contentIntent != null) {
            builder.setContentIntent(contentIntent);
        }

        return builder.build();
    }

    private void updateNotification() {
        NotificationManager manager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification());
        }
    }

    private void createNotificationChannel() {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            NotificationChannel channel =
                    new NotificationChannel(
                            CHANNEL_ID,
                            "AEMP Playback",
                            NotificationManager.IMPORTANCE_LOW
                    );

            channel.setDescription("AEMP playback controls");

            NotificationManager manager =
                    getSystemService(NotificationManager.class);

            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();

        NotificationManager manager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
