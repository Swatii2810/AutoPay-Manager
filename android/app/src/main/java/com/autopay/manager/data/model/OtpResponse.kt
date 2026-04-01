package com.autopay.manager.data.model

import com.google.gson.annotations.SerializedName

data class OtpResponse(
    @SerializedName("Status")  val status: String,   // "Success" | "Error"
    @SerializedName("Details") val details: String   // "OTP Matched" | "OTP Mismatch" | "OTP Expired" | session id
)
