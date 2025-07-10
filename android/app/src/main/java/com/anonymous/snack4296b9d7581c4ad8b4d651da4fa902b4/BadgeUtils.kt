package com.anonymous.snack4296b9d7581c4ad8b4d651da4fa902b4

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import me.leolin.shortcutbadger.ShortcutBadger

object BadgeUtils {
    private const val TAG = "BadgeUtils"

    fun updateBadge(context: Context, count: Int) {
        try {
            Log.d(TAG, "Updating badge count to: $count")
            
            // Try ShortcutBadger first (works with most launchers)
            if (ShortcutBadger.isBadgeCounterSupported(context)) {
                ShortcutBadger.applyCount(context, count)
                Log.d(TAG, "Badge updated using ShortcutBadger")
                return
            }

            // Fallback to manufacturer-specific methods
            when {
                isSamsung() -> updateSamsungBadge(context, count)
                isHuawei() -> updateHuaweiBadge(context, count)
                isXiaomi() -> updateXiaomiBadge(context, count)
                isOppo() -> updateOppoBadge(context, count)
                isVivo() -> updateVivoBadge(context, count)
                isSony() -> updateSonyBadge(context, count)
                isHTC() -> updateHTCBadge(context, count)
                isLG() -> updateLGBadge(context, count)
                else -> Log.w(TAG, "No supported badge method found for this device")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update badge", e)
        }
    }

    fun clearBadge(context: Context) {
        updateBadge(context, 0)
    }

    private fun isSamsung(): Boolean {
        return Build.MANUFACTURER.equals("samsung", ignoreCase = true)
    }

    private fun isHuawei(): Boolean {
        return Build.MANUFACTURER.equals("huawei", ignoreCase = true)
    }

    private fun isXiaomi(): Boolean {
        return Build.MANUFACTURER.equals("xiaomi", ignoreCase = true)
    }

    private fun isOppo(): Boolean {
        return Build.MANUFACTURER.equals("oppo", ignoreCase = true)
    }

    private fun isVivo(): Boolean {
        return Build.MANUFACTURER.equals("vivo", ignoreCase = true)
    }

    private fun isSony(): Boolean {
        return Build.MANUFACTURER.equals("sony", ignoreCase = true)
    }

    private fun isHTC(): Boolean {
        return Build.MANUFACTURER.equals("htc", ignoreCase = true)
    }

    private fun isLG(): Boolean {
        return Build.MANUFACTURER.equals("lg", ignoreCase = true)
    }

    private fun updateSamsungBadge(context: Context, count: Int) {
        try {
            val intent = Intent("android.intent.action.BADGE_COUNT_UPDATE")
            intent.putExtra("badge_count_package_name", context.packageName)
            intent.putExtra("badge_count_class_name", getLauncherClassName(context))
            intent.putExtra("badge_count", count)
            context.sendBroadcast(intent)
            Log.d(TAG, "Samsung badge updated")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update Samsung badge", e)
        }
    }

    private fun updateHuaweiBadge(context: Context, count: Int) {
        try {
            val bundle = android.os.Bundle()
            bundle.putString("package", context.packageName)
            bundle.putString("class", getLauncherClassName(context))
            bundle.putInt("badgenumber", count)
            context.contentResolver.call(
                Uri.parse("content://com.huawei.android.launcher.settings/badge/"),
                "change_badge",
                null,
                bundle
            )
            Log.d(TAG, "Huawei badge updated")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update Huawei badge", e)
        }
    }

    private fun updateXiaomiBadge(context: Context, count: Int) {
        try {
            val intent = Intent("android.intent.action.APPLICATION_MESSAGE_UPDATE")
            intent.putExtra("android.intent.extra.update_application_component_name", context.packageName + "/" + getLauncherClassName(context))
            intent.putExtra("android.intent.extra.update_application_message_text", if (count == 0) "" else count.toString())
            context.sendBroadcast(intent)
            Log.d(TAG, "Xiaomi badge updated")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update Xiaomi badge", e)
        }
    }

    private fun updateOppoBadge(context: Context, count: Int) {
        try {
            val intent = Intent("com.oppo.unsettledevent")
            intent.putExtra("pakeageName", context.packageName)
            intent.putExtra("number", count)
            intent.putExtra("upgradeNumber", count)
            context.sendBroadcast(intent)
            Log.d(TAG, "Oppo badge updated")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update Oppo badge", e)
        }
    }

    private fun updateVivoBadge(context: Context, count: Int) {
        try {
            val intent = Intent()
            intent.action = "launcher.action.CHANGE_APPLICATION_NOTIFICATION_NUM"
            intent.putExtra("packageName", context.packageName)
            intent.putExtra("className", getLauncherClassName(context))
            intent.putExtra("notificationNum", count)
            context.sendBroadcast(intent)
            Log.d(TAG, "Vivo badge updated")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update Vivo badge", e)
        }
    }

    private fun updateSonyBadge(context: Context, count: Int) {
        try {
            val intent = Intent("com.sonyericsson.home.intent.action.BROADCAST_BADGE")
            intent.putExtra("com.sonyericsson.home.intent.extra.badge.ACTIVITY_NAME", getLauncherClassName(context))
            intent.putExtra("com.sonyericsson.home.intent.extra.badge.SHOW_MESSAGE", count > 0)
            intent.putExtra("com.sonyericsson.home.intent.extra.badge.MESSAGE", count.toString())
            intent.putExtra("com.sonyericsson.home.intent.extra.badge.PACKAGE_NAME", context.packageName)
            context.sendBroadcast(intent)
            Log.d(TAG, "Sony badge updated")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update Sony badge", e)
        }
    }

    private fun updateHTCBadge(context: Context, count: Int) {
        try {
            val intent = Intent("com.htc.launcher.action.SET_NOTIFICATION")
            intent.putExtra("com.htc.launcher.extra.COMPONENT", ComponentName(context.packageName, getLauncherClassName(context)).flattenToString())
            intent.putExtra("com.htc.launcher.extra.COUNT", count)
            context.sendBroadcast(intent)
            Log.d(TAG, "HTC badge updated")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update HTC badge", e)
        }
    }

    private fun updateLGBadge(context: Context, count: Int) {
        try {
            val intent = Intent("android.intent.action.BADGE_COUNT_UPDATE")
            intent.putExtra("badge_count_package_name", context.packageName)
            intent.putExtra("badge_count_class_name", getLauncherClassName(context))
            intent.putExtra("badge_count", count)
            context.sendBroadcast(intent)
            Log.d(TAG, "LG badge updated")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update LG badge", e)
        }
    }

    private fun getLauncherClassName(context: Context): String {
        val packageManager = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN)
        intent.addCategory(Intent.CATEGORY_LAUNCHER)
        intent.setPackage(context.packageName)
        
        val resolveInfoList = packageManager.queryIntentActivities(intent, 0)
        return if (resolveInfoList.isNotEmpty()) {
            resolveInfoList[0].activityInfo.name
        } else {
            "com.anonymous.snack4296b9d7581c4ad8b4d651da4fa902b4.MainActivity"
        }
    }
} 