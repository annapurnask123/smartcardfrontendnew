import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api, { stationAPI, userJourneyAPI } from '../api/api';

// Utility: parse query params
function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// Normalize station object
function normalizeStation(st) {
  return {
    id: String(st.stop_id || st._id || st.id || st.stationId || ''),
    name: st.name || st.title || st.stationName || `Station ${st.stop_id || st._id || st.id || ''}`
  };
}

function JourneyTracker() {
  const query = useQuery();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  // Inputs (via query or state)
  const initialStart = query.get('startStationId') || query.get('from') || '';
  const initialEnd = query.get('endStationId') || query.get('to') || '';
  const initialMode = query.get('mode') || 'card'; // 'card' | 'ticket'
  const relatedId = query.get('id') || ''; // cardId or ticketId

  const [startStationId, setStartStationId] = useState(String(initialStart));
  const [endStationId, setEndStationId] = useState(String(initialEnd));
  const [mode, setMode] = useState(initialMode);
  const [routeStations, setRouteStations] = useState([]); // normalized stations array
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState('');

  // Tracking state
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [journeyId, setJourneyId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  // 20 seconds step
  const STEP_MS = 20000;
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearAll = useCallback(() => {
    resetTimer();
    setRunning(false);
    setPaused(false);
    setCurrentIndex(0);
    setStartedAt(null);
    setEndedAt(null);
    setJourneyId(null);
    setStatusMsg('');
  }, [resetTimer]);

  // Build route between start and end
  const buildRoute = useCallback(async () => {
    if (!startStationId || !endStationId) return;
    setLoadingRoute(true);
    setError('');
    try {
      // Try server-provided route with timings
      const res = await stationAPI.getRouteWithTimings(startStationId, endStationId);
      const data = res.data || {};

      let stations = [];
      if (Array.isArray(data?.stations)) stations = data.stations;
      else if (Array.isArray(data?.route?.stations)) stations = data.route.stations;
      else if (Array.isArray(data?.path)) stations = data.path;
      else if (Array.isArray(data)) stations = data;

      let normalized = stations.map(normalizeStation).filter((s) => s.id);

      // Fallback: if empty or missing endpoints, at least include start and end
      if (normalized.length === 0) {
        // Try to fetch stations and extract the two endpoints
        try {
          const all = await stationAPI.getAllStations();
          const list = (Array.isArray(all.data) ? all.data : all.data?.items) || [];
          const map = list.map(normalizeStation);
          const start = map.find((s) => s.id === String(startStationId));
          const end = map.find((s) => s.id === String(endStationId));
          normalized = [start, end].filter(Boolean);
        } catch (_) {
          // Last resort: just create synthetic endpoints
          normalized = [
            { id: String(startStationId), name: `Start ${startStationId}` },
            { id: String(endStationId), name: `End ${endStationId}` }
          ];
        }
      }

      // Ensure start is first and end is last
      const startIdx = normalized.findIndex((s) => s.id === String(startStationId));
      const endIdx = normalized.findIndex((s) => s.id === String(endStationId));

      if (startIdx > -1 && endIdx > -1 && startIdx > endIdx) {
        normalized = [...normalized].reverse();
      }

      setRouteStations(normalized);
    } catch (err) {
      console.error('Failed to build route:', err);
      setError('Failed to fetch route. You can still run a basic simulation.');
      setRouteStations([
        { id: String(startStationId), name: `Start ${startStationId}` },
        { id: String(endStationId), name: `End ${endStationId}` }
      ]);
    } finally {
      setLoadingRoute(false);
    }
  }, [startStationId, endStationId]);

  useEffect(() => {
    buildRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStation = routeStations[currentIndex] || null;
  const nextStation = routeStations[currentIndex + 1] || null;
  const remainingCount = Math.max(0, routeStations.length - currentIndex - 1);
  const progressPct = routeStations.length > 1 ? Math.round((currentIndex / (routeStations.length - 1)) * 100) : 0;

  const recordProgress = useCallback(async (jId, station, index) => {
    if (!jId || !station?.id) return;
    const payload = {
      stationId: String(station.id),
      index,
      timestamp: new Date().toISOString(),
      mode,
      relatedId: relatedId ? String(relatedId) : undefined,
    };
    // Try multiple endpoints safely
    const candidates = [
      `/user-journeys/journeys/${jId}/progress`,
      `/user-journeys/journeys/${jId}/tracking`,
      `/journey-history/${jId}/progress`
    ];
    for (const path of candidates) {
      try {
        await api.post(path, payload);
        break;
      } catch (_) {
        // continue
      }
    }
  }, [mode, relatedId]);

  const recordSummary = useCallback(async (jId, durationSeconds) => {
    if (!jId) return;
    const payload = {
      startStationId: String(startStationId),
      endStationId: String(endStationId),
      visitedStations: routeStations.map((s) => s.id),
      durationSeconds,
      mode,
      relatedId: relatedId ? String(relatedId) : undefined,
      endedAt: new Date().toISOString(),
    };
    const candidates = [
      `/user-journeys/journeys/${jId}/tracking`,
      `/user-journeys/journeys/${jId}/summary`,
      `/journey-history/${jId}/summary`
    ];
    for (const path of candidates) {
      try {
        await api.post(path, payload);
        break;
      } catch (_) {}
    }
  }, [endStationId, mode, relatedId, routeStations, startStationId]);

  const startSimulation = useCallback(async () => {
    if (routeStations.length < 2) {
      setError('Route is too short. Please choose valid start and end stations.');
      return;
    }
    setError('');
    setStatusMsg('Starting journey...');

    // Create a backend journey for tracking if possible
    try {
      const body = {
        from_stop_id: String(startStationId),
        to_stop_id: String(endStationId),
        userId: String(user?._id || user?.id || ''),
        mode,
        relatedId: relatedId ? String(relatedId) : undefined,
        startedAt: new Date().toISOString()
      };
      const res = await userJourneyAPI.startJourney(body);
      const created = res.data || {};
      const jId = String(created._id || created.id || created.journeyId || '');
      if (jId) setJourneyId(jId);
    } catch (e) {
      console.warn('Failed to create journey on server, continuing locally');
    }

    setRunning(true);
    setPaused(false);
    setStartedAt(Date.now());

    // Record first station
    if (journeyId) {
      try { await recordProgress(journeyId, routeStations[0], 0); } catch (_) {}
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIdx = prev + 1;
        // If still within route, step and record progress
        if (nextIdx < routeStations.length) {
          const station = routeStations[nextIdx];
          if (journeyId) recordProgress(journeyId, station, nextIdx);
          setStatusMsg(`Moved to ${station.name}`);
          return nextIdx;
        }
        // Completed
        resetTimer();
        setRunning(false);
        setPaused(false);
        const endTs = Date.now();
        setEndedAt(endTs);
        const durationSeconds = startedAt ? Math.round((endTs - startedAt) / 1000) : 0;
        setStatusMsg(`Journey completed in ${durationSeconds}s`);

        (async () => {
          try {
            if (journeyId) {
              await recordSummary(journeyId, durationSeconds);
              try { await userJourneyAPI.endJourney(journeyId, 'completed'); } catch (_) {}
            }
          } catch (_) {}
        })();

        return prev; // no further increment
      });
    }, STEP_MS);
  }, [routeStations, startStationId, endStationId, user, mode, relatedId, journeyId, recordProgress, recordSummary, resetTimer, startedAt]);

  const pauseSimulation = useCallback(() => {
    if (!running || paused) return;
    setPaused(true);
    resetTimer();
    setStatusMsg('Paused');
  }, [paused, resetTimer, running]);

  const resumeSimulation = useCallback(() => {
    if (!running || !paused) return;
    setPaused(false);
    setStatusMsg('Resuming...');

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIdx = prev + 1;
        if (nextIdx < routeStations.length) {
          const station = routeStations[nextIdx];
          if (journeyId) recordProgress(journeyId, station, nextIdx);
          setStatusMsg(`Moved to ${station.name}`);
          return nextIdx;
        }
        resetTimer();
        setRunning(false);
        setPaused(false);
        const endTs = Date.now();
        setEndedAt(endTs);
        const durationSeconds = startedAt ? Math.round((endTs - startedAt) / 1000) : 0;
        setStatusMsg(`Journey completed in ${durationSeconds}s`);

        (async () => {
          try {
            if (journeyId) {
              await recordSummary(journeyId, durationSeconds);
              try { await userJourneyAPI.endJourney(journeyId, 'completed'); } catch (_) {}
            }
          } catch (_) {}
        })();

        return prev;
      });
    }, STEP_MS);
  }, [journeyId, paused, recordProgress, recordSummary, resetTimer, routeStations.length, running, startedAt]);

  const resetSimulation = useCallback(() => {
    clearAll();
    buildRoute();
  }, [buildRoute, clearAll]);

  useEffect(() => () => resetTimer(), [resetTimer]);

  return (
    <div className="container mt-5 pt-5">
      <div className="row">
        <div className="col-12">
          <h3>
            <i className="fas fa-route me-2"></i>
            Journey Tracker
          </h3>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Start Station ID</label>
              <input
                className="form-control"
                value={startStationId}
                onChange={(e) => setStartStationId(String(e.target.value))}
                placeholder="e.g., 20"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">End Station ID</label>
              <input
                className="form-control"
                value={endStationId}
                onChange={(e) => setEndStationId(String(e.target.value))}
                placeholder="e.g., 28"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Mode</label>
              <select className="form-select" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="card">Card</option>
                <option value="ticket">Ticket</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Related ID (Card/Ticket)</label>
              <input
                className="form-control"
                value={relatedId}
                onChange={(e) => {/* read-only from query */}}
                placeholder="Optional"
                disabled
              />
            </div>
          </div>

          <div className="mt-3 d-flex gap-2">
            <button className="btn btn-primary" onClick={startSimulation} disabled={running || loadingRoute || !startStationId || !endStationId}>
              <i className="fas fa-play me-2"></i>Start
            </button>
            <button className="btn btn-warning" onClick={pauseSimulation} disabled={!running || paused}>
              <i className="fas fa-pause me-2"></i>Pause
            </button>
            <button className="btn btn-success" onClick={resumeSimulation} disabled={!running || !paused}>
              <i className="fas fa-play me-2"></i>Resume
            </button>
            <button className="btn btn-secondary" onClick={resetSimulation}>
              <i className="fas fa-undo me-2"></i>Reset
            </button>
            <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
              <i className="fas fa-arrow-left me-2"></i>Back
            </button>
          </div>

          {statusMsg && (
            <div className="mt-3 alert alert-info py-2 mb-0">
              <i className="fas fa-info-circle me-2"></i>{statusMsg}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <strong>Current:</strong> {currentStation ? currentStation.name : '—'}
            </div>
            <div>
              <strong>Next:</strong> {nextStation ? nextStation.name : '—'}
            </div>
            <div>
              <strong>Remaining:</strong> {remainingCount}
            </div>
          </div>

          <div className="progress" style={{ height: 10 }}>
            <div className="progress-bar" role="progressbar" style={{ width: `${progressPct}%` }} aria-valuenow={progressPct} aria-valuemin="0" aria-valuemax="100"></div>
          </div>

          <div className="mt-3">
            <h6>Route</h6>
            {loadingRoute ? (
              <div><span className="spinner-border spinner-border-sm me-2"></span>Loading route...</div>
            ) : (
              <ol className="list-group list-group-numbered">
                {routeStations.map((st, idx) => (
                  <li key={`${st.id}-${idx}`} className={`list-group-item d-flex justify-content-between align-items-center ${idx === currentIndex ? 'active text-white' : ''}`}>
                    <span>{st.name}</span>
                    {idx === currentIndex && <span className="badge bg-light text-dark">Current</span>}
                    {idx > currentIndex && <span className="badge bg-secondary">Upcoming</span>}
                    {idx < currentIndex && <span className="badge bg-success">Passed</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .list-group-item.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
        }
      `}</style>
    </div>
  );
}

export default JourneyTracker;
