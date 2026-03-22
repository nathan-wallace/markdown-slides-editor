function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createPresenterTimerState(durationMinutes) {
  return {
    durationMinutes: Math.max(1, Number.parseInt(durationMinutes, 10) || 30),
    remainingMs: Math.max(1, Number.parseInt(durationMinutes, 10) || 30) * 60 * 1000,
    paused: false,
    lastTickAt: Date.now(),
  };
}

export function tickPresenterTimer(timerState, now = Date.now()) {
  if (timerState.paused) {
    return {
      ...timerState,
      lastTickAt: now,
    };
  }

  const elapsed = Math.max(0, now - timerState.lastTickAt);
  return {
    ...timerState,
    remainingMs: Math.max(0, timerState.remainingMs - elapsed),
    lastTickAt: now,
  };
}

export function setPresenterTimerPaused(timerState, paused, now = Date.now()) {
  return {
    ...timerState,
    paused,
    lastTickAt: now,
  };
}

export function adjustPresenterTimerMinutes(timerState, deltaMinutes) {
  const durationMinutes = clamp(timerState.durationMinutes + deltaMinutes, 1, 240);
  const deltaMs = deltaMinutes * 60 * 1000;
  return {
    ...timerState,
    durationMinutes,
    remainingMs: clamp(timerState.remainingMs + deltaMs, 0, durationMinutes * 60 * 1000),
  };
}

export function resetPresenterTimer(timerState, durationMinutes = timerState.durationMinutes, now = Date.now()) {
  const nextDuration = Math.max(1, Number.parseInt(durationMinutes, 10) || timerState.durationMinutes || 30);
  return {
    durationMinutes: nextDuration,
    remainingMs: nextDuration * 60 * 1000,
    paused: false,
    lastTickAt: now,
  };
}

export function formatPresenterTimerMinutes(remainingMs) {
  const remainingMinutes = Math.ceil(Math.max(0, remainingMs) / 60000);
  return `${remainingMinutes} min`;
}

export function getPresenterTimerProgress(timerState) {
  if (timerState.durationMinutes <= 0) return 0;
  return clamp(timerState.remainingMs / (timerState.durationMinutes * 60 * 1000), 0, 1);
}

export function getPresenterTimerTone(timerState) {
  const progress = getPresenterTimerProgress(timerState);
  if (progress <= 0.15) return "danger";
  if (progress <= 0.35) return "warning";
  return "safe";
}
