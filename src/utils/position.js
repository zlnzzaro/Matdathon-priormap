export function scoreToPosition(importance, urgency) {
  return {
    x: 100 - urgency,
    y: 100 - importance,
  }
}
