import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../api/axios';

export const loginUser = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    const { data } = await API.post('/auth/login', creds);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Login failed');
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await API.get('/auth/me');
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Session expired');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: false, error: null, initialized: false },
  reducers: {
    logout(state) {
      state.user = null;
      state.initialized = true;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    clearError(state) { state.error = null; },
    setInitialized(state) { state.initialized = true; },
    updateUserLogo(state, action) {
      if (state.user) {
        state.user.logo_url = action.payload;
      }
    },
  },
  extraReducers: (b) => {
    b.addCase(loginUser.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(loginUser.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; s.initialized = true; });
    b.addCase(loginUser.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
    b.addCase(fetchMe.pending, (s) => { s.loading = true; });
    b.addCase(fetchMe.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; s.initialized = true; });
    b.addCase(fetchMe.rejected, (s) => { s.loading = false; s.user = null; s.initialized = true; });
  },
});

export const { logout, clearError, setInitialized, updateUserLogo } = authSlice.actions;
export default authSlice.reducer;
