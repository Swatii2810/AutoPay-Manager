package com.autopay.manager.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.autopay.manager.data.repository.AuthRepository
import com.autopay.manager.data.repository.AuthResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class LoginUiState {
    object Idle : LoginUiState()
    object Loading : LoginUiState()
    data class Success(val mobile: String) : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}

class LoginViewModel(
    private val repository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState

    fun onMobileComplete(mobile: String) {
        if (mobile.length != 10) return
        sendOtp(mobile)
    }

    private fun sendOtp(mobile: String) {
        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading
            when (val result = repository.sendOtp(mobile)) {
                is AuthResult.Success -> _uiState.value = LoginUiState.Success(mobile)
                is AuthResult.Error   -> _uiState.value = LoginUiState.Error(result.message)
            }
        }
    }

    fun resetState() { _uiState.value = LoginUiState.Idle }
}
