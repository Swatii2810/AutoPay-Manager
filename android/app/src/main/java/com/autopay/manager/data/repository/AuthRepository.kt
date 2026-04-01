package com.autopay.manager.data.repository

import com.autopay.manager.data.api.RetrofitClient
import com.autopay.manager.data.model.OtpResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

sealed class AuthResult<out T> {
    data class Success<T>(val data: T) : AuthResult<T>()
    data class Error(val message: String) : AuthResult<Nothing>()
}

class AuthRepository {

    suspend fun sendOtp(mobile: String): AuthResult<OtpResponse> =
        withContext(Dispatchers.IO) {
            try {
                val response = RetrofitClient.authApi.sendOtp(mobile)
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    if (body.status == "Success") AuthResult.Success(body)
                    else AuthResult.Error(body.details)
                } else {
                    AuthResult.Error("Failed to send OTP. Please try again.")
                }
            } catch (e: Exception) {
                AuthResult.Error(e.message ?: "Network error. Check your connection.")
            }
        }

    suspend fun verifyOtp(mobile: String, otp: String): AuthResult<OtpResponse> =
        withContext(Dispatchers.IO) {
            try {
                val response = RetrofitClient.authApi.verifyOtp(mobile, otp)
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    when {
                        body.status == "Success" && body.details == "OTP Matched" ->
                            AuthResult.Success(body)
                        body.details == "OTP Expired" ->
                            AuthResult.Error("OTP has expired. Please resend.")
                        body.details == "OTP Mismatch" ->
                            AuthResult.Error("Incorrect OTP. Please try again.")
                        else ->
                            AuthResult.Error(body.details)
                    }
                } else {
                    AuthResult.Error("Verification failed. Please try again.")
                }
            } catch (e: Exception) {
                AuthResult.Error(e.message ?: "Network error. Check your connection.")
            }
        }
}
