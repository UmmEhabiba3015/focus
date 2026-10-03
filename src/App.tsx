import TextEditor from './text-styles/TextEditor';

function download(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export default function App() {
  return (
    <main className="app">
      <header>
        <h1>Text styles</h1>
        <p>Type your text, pick a style, then drag, resize and rotate it on the photo.</p>
      </header>
      <TextEditor
        photoUrl={`${import.meta.env.BASE_URL}sample-photo.jpg`}
        initialText="Eid Offer 50%"
        onExportImage={(url) => download(url, 'design.png')}
        onExportTextLayer={(url) => download(url, 'text-layer.png')}
      />
    </main>
  );
}
