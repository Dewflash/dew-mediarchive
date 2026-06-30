export function Popup() {
  return (
    <main className="popup">
      <header className="popup__header">
        <div>
          <p className="popup__eyebrow">Dew MediArchive</p>
          <h1 className="popup__title">No media detected yet</h1>
        </div>
      </header>

      <section className="popup__empty" aria-live="polite">
        <p>
          Start playback on a page with authorized non-DRM media. Dew will list
          detected candidates here.
        </p>
      </section>
    </main>
  );
}

