import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: { query: '' },
  reducers: {
    setQuery(state, action) {
      state.query = action.payload || ''
    },
    clearQuery(state) {
      state.query = ''
    },
  },
})

export const { setQuery, clearQuery } = uiSlice.actions
export default uiSlice.reducer

