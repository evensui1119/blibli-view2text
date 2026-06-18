import { VideoInput } from "./components/VideoInput";
import { ArticleView } from "./components/ArticleView";
import { useSSE } from "./hooks/useSSE";
import "./App.css";

function App() {
  const { content, status, isLoading, taskId, sections, error, subtitleText, subtitleTitle, generate, reset } = useSSE();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bilibili View2Text</h1>
        <p className="subtitle">B站视频字幕转结构化文章 · 基于 LangChain + 通义千问</p>
        {content && (
          <button onClick={reset} className="btn-reset">
            重新开始
          </button>
        )}
      </header>

      <main className="app-main">
        <VideoInput onSubmit={(params) => generate(params)} isLoading={isLoading} />
        <ArticleView
          content={content}
          status={status}
          isLoading={isLoading}
          taskId={taskId}
          sections={sections}
          error={error}
          subtitleText={subtitleText}
          subtitleTitle={subtitleTitle}
        />
      </main>

      <footer className="app-footer">
        <p>Powered by LangChain & 通义千问</p>
      </footer>
    </div>
  );
}

export default App;
