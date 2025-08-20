import { useSelector, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchStations, setSearch, setPage } from '../slices/stationSlice'

function HomePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(state => state.auth.user)
  const { items: stations, page, pageSize, total, loading, search, error } = useSelector(state => state.stations)

  useEffect(() => {
    dispatch(fetchStations())
  }, [dispatch])

  function onBook(station) {
    const id = station.id || station._id || station.stationId || station.code
    navigate('/book?sourceId=' + encodeURIComponent(id))
  }

  function handleSearch(e) {
    dispatch(setSearch(e.target.value))
  }

  function handlePageChange(newPage) {
    dispatch(setPage(newPage))
  }

  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">Welcome, <span>{user?.name || 'User'}</span>!</h2>

          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5><i className="fas fa-search me-2"></i>Find Stations</h5>
            </div>
            <div className="card-body">
              <form className="input-group" onSubmit={e => e.preventDefault()}>
                <input type="text" className="form-control" placeholder="Search stations..." value={search} onChange={handleSearch} />
                <button className="btn btn-outline-primary" type="submit">
                  <i className="fas fa-search"></i>
                </button>
              </form>
            </div>
          </div>

          {loading && <div>Loading...</div>}
          {error && <div className="text-danger">{error}</div>}
          <div className="row">
            {stations.map(station => (
              <div key={station.id || station._id} className="col-md-4 mb-3">
                <div className="card">
                  <div className="card-body">
                    <h5>{station.name}</h5>
                    <button className="btn btn-primary" onClick={() => onBook(station)}>Book</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            pagination={{ page, pageSize, total }}
            onPrev={() => handlePageChange(page - 1)}
            onNext={() => handlePageChange(page + 1)}
          />
        </div>
      </div>
    </div>
  )
}

function Pagination({ pagination, onPrev, onNext }) {
  const { page, pageSize, total } = pagination
  const maxPage = total ? Math.ceil(total / pageSize) : page
  return (
    <div className="d-flex justify-content-between align-items-center mt-3">
      <button className="btn btn-outline-primary" disabled={page <= 1} onClick={onPrev}>
        <i className="fas fa-chevron-left me-1"></i>Prev
      </button>
      <span>Page {page}{maxPage ? ` of ${maxPage}` : ''}</span>
      <button className="btn btn-outline-primary" disabled={maxPage && page >= maxPage} onClick={onNext}>
        Next<i className="fas fa-chevron-right ms-1"></i>
      </button>
    </div>
  )
}

export default HomePage