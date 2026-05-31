export default function SiteFooter() {
  return (
    <footer className="bg-gray-50 px-4 pb-6 pt-2 text-center text-xs text-gray-500">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-2 border-t border-gray-200 pt-4">
        <a
          href="https://beian.mps.gov.cn/#/query/webSearch?code=13019902001207"
          rel="noreferrer"
          target="_blank"
          className="inline-flex min-h-[24px] items-center justify-center gap-1.5 text-gray-500 active:text-gray-700"
        >
          <img src="/beian-icon.png" alt="" className="h-4 w-4 object-contain" />
          <span>冀公网安备13019902001207号</span>
        </a>
        <p>冀ICP备2026016123号-1</p>
      </div>
    </footer>
  )
}
