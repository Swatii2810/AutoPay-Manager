package com.autopay.manager.data.api

import com.autopay.manager.data.model.OtpResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

interface AuthApiService {

    // API key is injected at runtime via BuildConfig.TWO_FACTOR_API_KEY
    // (set in local.properties → build.gradle, never hardcoded here)

    @GET("V1/{apiKey}/SMS/{mobile}/AUTOGEN")
    suspend fun sendOtp(
        @Path("apiKey") apiKey: String,
        @Path("mobile") mobile: String
    ): Response<OtpResponse>

    @GET("V1/{apiKey}/SMS/VERIFY3/{mobile}/{otp}")
    suspend fun verifyOtp(
        @Path("apiKey") apiKey: String,
        @Path("mobile") mobile: String,
        @Path("otp") otp: String
    ): Response<OtpResponse>
}
