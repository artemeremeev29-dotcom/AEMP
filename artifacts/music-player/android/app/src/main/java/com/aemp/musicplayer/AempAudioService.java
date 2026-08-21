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
import androidx.media.app.NotificationCompat.MediaStyle;
import androidx.media.session.MediaButtonReceiver;

import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

public class AempAudioService extends Service {

    public static final String ACTION_UPDATE_METADATA =
            "com.aemp.musicplayer.UPDATE_METADATA";

    public static final String EXTRA_TITLE =
            "com.aemp.musicplayer.TITLE";

    public static final String EXTRA_ARTIST =
            "com.aemp.musicplayer.ARTIST";

    private static final String CHANNEL_ID = "aemp_playback";
    private static final int NOTIFICATION_ID = 1001;

    private MediaSessionCompat mediaSession;

    private String currentTitle = "AEMP";
    private String currentArtist = "AEMP";

    @Override
    public void onCreate() {
        super.onCreate();

        createNotificationChannel();

        mediaSession = new MediaSessionCompat(this, "AEMP");

        mediaSession.setCallback(new MediaSessionCompat.Callback() {

            @Override
            public void onPlay() {
                updatePlaybackState(true);
            }

            @Override
            public void onPause() {
                updatePlaybackState(false);
            }

            @Override
            public void onSkipToNext() {
                // Будет подключено к AEMP на следующем этапе.
            }

            @Override
            public void onSkipToPrevious() {
                // Будет подключено к AEMP на следующем этапе.
            }
        });

        mediaSession.setActive(true);

        updateMetadata(
                currentTitle,
                currentArtist
        );

        updatePlaybackState(true);

        startForeground(
                NOTIFICATION_ID,
                createNotification()
        );
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            NotificationChannel channel =
                    new NotificationChannel(
                            CHANNEL_ID,
                            "AEMP Playback",
                            NotificationManager.IMPORTANCE_LOW
                    );

            channel.setDescription(
                    "Управление воспроизведением AEMP"
            );

            NotificationManager manager =
                    getSystemService(
                            NotificationManager.class
                    );

            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void updateMetadata(
            String title,
            String artist
    ) {
        currentTitle =
                title != null && !title.isEmpty()
                        ? title
                        : "AEMP";

        currentArtist =
                artist != null && !artist.isEmpty()
                        ? artist
                        : "AEMP";

        if (mediaSession != null) {

            MediaMetadataCompat metadata =
                    new MediaMetadataCompat.Builder()
                            .putString(
                                    MediaMetadataCompat.METADATA_KEY_TITLE,
                                    currentTitle
                            )
                            .putString(
                                    MediaMetadataCompat.METADATA_KEY_ARTIST,
                                    currentArtist
                            )
                            .build();

            mediaSession.setMetadata(metadata);
        }
    }

    private void updatePlaybackState(
            boolean playing
    ) {
        int state = playing
                ? PlaybackStateCompat.STATE_PLAYING
                : PlaybackStateCompat.STATE_PAUSED;

        PlaybackStateCompat playbackState =
                new PlaybackStateCompat.Builder()
                        .setActions(
                                PlaybackStateCompat.ACTION_PLAY |
                                PlaybackStateCompat.ACTION_PAUSE |
                                PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                        )
                        .setState(
                                state,
                                PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN,
                                1.0f
                        )
                        .build();

        mediaSession.setPlaybackState(
                playbackState
        );

        NotificationManager manager =
                getSystemService(
                        NotificationManager.class
                );

        if (manager != null) {
            manager.notify(
                    NOTIFICATION_ID,
                    createNotification()
            );
        }
    }

    private Notification createNotification() {

        Intent intent =
                new Intent(
                        this,
                        MainActivity.class
                );

        PendingIntent pendingIntent =
                PendingIntent.getActivity(
                        this,
                        0,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT |
                        (
                                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                                        ? PendingIntent.FLAG_IMMUTABLE
                                        : 0
                        )
                );

        return new NotificationCompat.Builder(
                this,
                CHANNEL_ID
        )
                .setContentTitle(currentTitle)
                .setContentText(currentArtist)
                .setSmallIcon(
                        android.R.drawable.ic_media_play
                )
                .setContentIntent(
                        pendingIntent
                )
                .setOngoing(true)
                .setCategory(
                        NotificationCompat.CATEGORY_TRANSPORT
                )
                .setPriority(
                        NotificationCompat.PRIORITY_LOW
                )
                .setStyle(
                        new MediaStyle()
                                .setMediaSession(
                                        mediaSession.getSessionToken()
                                )
                                .setShowActionsInCompactView(
                                        0,
                                        1,
                                        2
                                )
                )
                .addAction(
                        new NotificationCompat.Action(
                                android.R.drawable.ic_media_previous,
                                "Предыдущий",
                                MediaButtonReceiver
                                        .buildMediaButtonPendingIntent(
                                                this,
                                                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                                        )
                        )
                )
                .addAction(
                        new NotificationCompat.Action(
                                android.R.drawable.ic_media_play,
                                "Воспроизвести",
                                MediaButtonReceiver
                                        .buildMediaButtonPendingIntent(
                                                this,
                                                PlaybackStateCompat.ACTION_PLAY
                                        )
                        )
                )
                .addAction(
                        new NotificationCompat.Action(
                                android.R.drawable.ic_media_next,
                                "Следующий",
                                MediaButtonReceiver
                                        .buildMediaButtonPendingIntent(
                                                this,
                                                PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                                        )
                        )
                )
                .build();
    }

    @Override
    public int onStartCommand(
            Intent intent,
            int flags,
            int startId
    ) {

        if (intent != null) {

            String action =
                    intent.getAction();

            if (ACTION_UPDATE_METADATA.equals(action)) {

                String title =
                        intent.getStringExtra(
                                EXTRA_TITLE
                        );

                String artist =
                        intent.getStringExtra(
                                EXTRA_ARTIST
                        );

                updateMetadata(
                        title,
                        artist
                );

                NotificationManager manager =
                        getSystemService(
                                NotificationManager.class
                        );

                if (manager != null) {
                    manager.notify(
                            NOTIFICATION_ID,
                            createNotification()
                    );
                }

            } else {
                MediaButtonReceiver.handleIntent(
                        mediaSession,
                        intent
                );
            }
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {

        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }

        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(
            Intent intent
    ) {
        return null;
    }
}
