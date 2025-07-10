package com.anonymous.snack4296b9d7581c4ad8b4d651da4fa902b4

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class BadgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        private const val TAG = "BadgeModule"
    }

    override fun getName(): String {
        return "BadgeModule"
    }

    @ReactMethod
    fun updateBadge(count: Int, promise: Promise) {
        try {
            Log.d(TAG, "Updating badge count to: $count")
            BadgeUtils.updateBadge(reactApplicationContext, count)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update badge", e)
            promise.reject("BADGE_UPDATE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearBadge(promise: Promise) {
        try {
            Log.d(TAG, "Clearing badge")
            BadgeUtils.clearBadge(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear badge", e)
            promise.reject("BADGE_CLEAR_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isBadgeSupported(promise: Promise) {
        try {
            val isSupported = me.leolin.shortcutbadger.ShortcutBadger.isBadgeCounterSupported(reactApplicationContext)
            Log.d(TAG, "Badge support check: $isSupported")
            promise.resolve(isSupported)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check badge support", e)
            promise.reject("BADGE_SUPPORT_CHECK_ERROR", e.message, e)
        }
    }
} 