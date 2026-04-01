package com.autopay.manager.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autopay.manager.data.repository.AuthRepository
import com.autopay.manager.data.repository.AuthResult
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class OtpUiState {
    object Idle : OtpUiState()
    object Loading : OtpUiState()
    object Success : OtpUiState()
    data class Error(val message: String) : OtpUiState()
}

class OtpViewModel(
    private val repository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow<OtpUiState>(OtpUiState.Idle)
    val uiState: StateFlow<OtpUiState> = _uiState

    private val _resendTimer = MutableStateFlow(30)
    val resendTimer: StateFlow<Int> = _resendTimer

    private val _canResend = MutableStateFlow(false)
    val canResend: StateFlow<Boolean> = _canResend

    // Tracks auto-filled OTP digits for animation (index → digit)
    private val _autoFillDigits = MutableStateFlow<Map<Int, String>>(emptyMap())
    val autoFillDigits: StateFlow<Map<Int, String>> = _autoFillDigits

    private var timerJob: Job? = null

    init { startResendTimer() }

    private fun startResendTimer() {
        _canResend.value = false
        _resendTimer.value = 30
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            repeat(30) {
                delay(1000)
                _resendTimer.value -= 1
            }
            _canResend.value = true
        }
    }

    /** Called when SMS Retriever detects OTP — animates digit-by-digit fill */
    fun onOtpAutoDetected(otp: String, mobile: String) {
        viewModelScope.launch {
            val digits = mutableMapOf<Int, String>()
            otp.forEachIndexed { index, char ->
                delay(120L * index)
                digits[index] = char.toString()
                _autoFillDigits.value = digits.toMap()
            }
            delay(300)
            verifyOtp(mobile, otp)
        }
    }

    fun verifyOtp(mobile: String, otp: String) {
        viewModelScope.launch {
            _uiState.value = OtpUiState.Loading
            when (val result = repository.verifyOtp(mobile, otp)) {
                is AuthResult.Success -> _uiState.value = OtpUiState.Success
                is AuthResult.Error   -> _uiState.value = OtpUiState.Error(result.message)
            }
        }
    }

    fun resendOtp(mobile: String) {
        viewModelScope.launch {
            repository.sendOtp(mobile)
            startResendTimer()
            _uiState.value = OtpUiState.Idle
            _autoFillDigits.value = emptyMap()
        }
    }

    fun resetError() { _uiState.value = OtpUiState.Idle }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}
