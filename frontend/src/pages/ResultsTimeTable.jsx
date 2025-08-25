export default function ResultsTimetable({ blocks }) {
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const byDay = Object.fromEntries(order.map((d) => [d, []]));
  (blocks || []).forEach((b) => (byDay[b.day] ??= []).push(b));

  return (
    <div className="timetable">
      {order.map((day) => (
        <div
          key={day}
          className="day"
        >
          <h5>{day}</h5>
          {(byDay[day] || []).map((b, i) => (
            <div
              key={i}
              className="block"
            >
              <div>{b.title}</div>
              <div className="muted">
                {b.start}–{b.end} • CRN {b.crn}
              </div>
            </div>
          ))}
          {!byDay[day]?.length && (
            <div
              className="muted"
              style={{ fontSize: 12 }}
            >
              —
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
