package com.anonymous.snack4296b9d7581c4ad8b4d651da4fa902b4

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class NotificationReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "NotificationReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Notification receiver called with action: ${intent.action}")
        
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED -> {
                Log.d(TAG, "Boot completed, initializing notifications")
                // Initialize notifications after boot
            }
            "com.anonymous.snack4296b9d7581c4ad8b4d651da4fa902b4.NOTIFICATION_RECEIVED" -> {
                Log.d(TAG, "Custom notification received")
                // Handle custom notification actions
            }
        }
    }
} 