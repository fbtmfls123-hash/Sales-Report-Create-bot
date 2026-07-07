import React, { useState, useEffect } from "react";
import { 
  Building2, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  MessageSquare, 
  TrendingUp, 
  Cpu, 
  ShieldAlert, 
  FileCheck,
  ChevronRight,
  Info,
  Key,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  AlertTriangle,
  Lock,
  Unlock
} from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<"standard" | "claim">("standard");

  // Gemini API Key State Variables - Reset on fresh load as requested: "매번 실행할 때마다 API Key를 입력"
  const [apiKey, setApiKey] = useState<string>("");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerifyingSystem, setIsVerifyingSystem] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Strict API Approval State - Must be false on startup to require key input every single execution
  const [isApproved, setIsApproved] = useState<boolean>(false);
  
  const [currentStatus, setCurrentStatus] = useState<"system" | "custom">("custom");

  // Force clean localStorage API key and approval on every fresh launch
  useEffect(() => {
    localStorage.removeItem("custom_gemini_api_key");
    localStorage.removeItem("api_key_approved");
  }, []);

  // Highlight and warning modal states
  const [highlightConfig, setHighlightConfig] = useState<boolean>(false);
  const [showBlockedModal, setShowBlockedModal] = useState<boolean>(false);

  const scrollToConfig = () => {
    setShowBlockedModal(false);
    const element = document.getElementById("api-key-config");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightConfig(true);
      setTimeout(() => {
        setHighlightConfig(false);
      }, 2500);
    }
  };

  const handleStartWithCheck = () => {
    if (isApproved) {
      onStart();
    } else {
      setShowBlockedModal(true);
      // Automatically focus or scroll after showing modal
      setTimeout(() => {
        scrollToConfig();
      }, 1200);
    }
  };

  const saveApiKeyLog = (keyText: string, status: string, latency: string, errorMsg?: string) => {
    try {
      const logsStr = localStorage.getItem("crm_api_key_logs") || "[]";
      const logs = JSON.parse(logsStr);
      const maskedKey = keyText.length > 8 
        ? `${keyText.substring(0, 8)}...${keyText.substring(keyText.length - 4)}` 
        : "단순 오류";
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleString("ko-KR"),
        maskedKey,
        status,
        latency,
        error: errorMsg || ""
      };
      logs.unshift(newLog); // newer first
      localStorage.setItem("crm_api_key_logs", JSON.stringify(logs.slice(0, 50))); // Keep last 50
    } catch (e) {
      console.error("Failed to save API key log:", e);
    }
  };

  const handleVerifyAndSaveKey = async () => {
    if (!apiKey.trim()) return;
    setIsVerifying(true);
    setVerificationResult(null);

    const startTime = Date.now();
    try {
      const response = await fetch("/api/gemini/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": apiKey.trim()
        }
      });
      const data = await response.json();
      const latency = `${Date.now() - startTime}ms`;

      if (response.ok && data.valid) {
        localStorage.setItem("custom_gemini_api_key", apiKey.trim());
        localStorage.setItem("api_key_approved", "true");
        setIsApproved(true);
        setVerificationResult({
          success: true,
          message: "개인 API Key 검증 및 사용 권한 승인이 성공적으로 완료되었습니다! 이제 모든 대화식 보고서 및 분석 기능이 활성화되었습니다."
        });
        setCurrentStatus("custom");
        saveApiKeyLog(apiKey.trim(), "성공", latency);
      } else {
        const errorMsg = data.error || "검증에 실패했습니다.";
        setVerificationResult({
          success: false,
          message: errorMsg + " 올바른 키 값을 입력했는지 확인해 주세요."
        });
        saveApiKeyLog(apiKey.trim(), "실패", latency, errorMsg);
      }
    } catch (err: any) {
      const latency = `${Date.now() - startTime}ms`;
      setVerificationResult({
        success: false,
        message: "서버와의 연동에 실패했습니다. 네트워크 연결을 다시 점검해 주세요."
      });
      saveApiKeyLog(apiKey.trim(), "실패", latency, "네트워크 / 서버 에러");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearKey = () => {
    const keyText = localStorage.getItem("custom_gemini_api_key") || "";
    localStorage.removeItem("custom_gemini_api_key");
    localStorage.removeItem("api_key_approved");
    setApiKey("");
    setVerificationResult(null);
    setCurrentStatus("custom");
    setIsApproved(false);
    saveApiKeyLog(keyText, "해제됨", "0ms", "사용자가 직접 키를 해제 및 해지함");
  };

  // Sample data to show before/after comparison
  const sampleScenarios = {
    standard: {
      before: "SK 박과장 만나서 커피 한잔 때림. 이번에 경쟁사 단가가 좀 더 저렴하게 들어왔다고 하던데, 그것 땜에 우리 제품 안 쓸 수도 있을 것 같다고 흘리더라... 한 7천만 원 규모 계약 날아갈 위기라 겁나 쫄았음. 어떻게 단가 맞춰보겠다고 대답하긴 했는데 차주에 특별 제안서라도 들고 가야겠음.",
      after: {
        purpose: "정기 방문을 통한 릴레이션십 강화 및 경쟁 현황 점검",
        result: "경쟁사 저가 단가 제안에 따른 계약 철회(Drop) 위기 감지",
        pipeline: "예상 규모 약 7,000만 원 상당 (수주 성공 확률 40%로 급락)",
        action: "차주 중 타사 대비 우위 요소가 포함된 차별화 제안서 작성 및 특별 절충 단가안을 지참한 보완 미팅 추진"
      },
      badge: "일반 영업 상담용"
    },
    claim: {
      before: "카카오 김팀장네 시스템이 우리 솔루션 업데이트하고 나서 어제 오후부터 먹통됐다고 완전 화가 머리끝까지 나서 전화옴. 계약 해지하니 마니 난리도 아님. 일단 엔지니어 보내서 오늘 새벽에 긴급 복구는 했는데 아직 불안함. 내부 점검 회의 필요할 듯.",
      after: {
        purpose: "솔루션 업데이트 이후 발생한 시스템 장애 긴급 복구 지원",
        result: "시스템 오류로 인한 고객사 이탈 위협 및 임원급 클레임 강도 인지",
        pipeline: "계약 해지 위협에 따른 전면 방어 단계 돌입 (수주 보장 0%)",
        action: "긴급 개발팀 합동 점검반 편성, 영구 장애 패치 적용 및 금일 중 보상안과 임원 공식 사과 서한 전달 예정"
      },
      badge: "긴급 클레임 대응용"
    }
  };

  const currentSample = sampleScenarios[activeTab];

  return (
    <div className="bg-slate-50 min-h-screen font-sans flex flex-col text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 antialiased">
      {/* Top Banner Accent */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 text-white text-[11px] font-bold text-center py-2 px-4 uppercase tracking-widest flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-300" />
        Pretendard Font Unified • LLM Powered Enterprise CRM Standardizer Active
      </div>

      {/* Main Content Scroll Wrap */}
      <div className="flex-1 overflow-y-auto">
        
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-extrabold mb-6 animate-bounce">
            <Cpu className="w-3.5 h-3.5" />
            <span>AI 기반 실시간 영업 정제 엔진</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            "지저분한 현장 일지가 <br className="sm:hidden" />
            <span className="text-indigo-600 bg-indigo-50/50 px-2 rounded-lg">완벽한 실무용 기안서</span>가 됩니다"
          </h1>
          
          <p className="mt-6 text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            영업 이동 시간, 차 안이나 외근 길에 카카오톡 대화하듯 편하게 말해 보세요. 
            AI가 난해한 현장 묘사를 해석하여 <span className="text-indigo-600 font-bold">정제된 비즈니스 톤</span>과 <span className="text-indigo-600 font-bold">ERP/CRM 표준 데이터</span>로 즉각 구조화합니다.
          </p>

          {/* Core Action Callouts */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleStartWithCheck}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-base shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition duration-300 flex items-center justify-center gap-2 group cursor-pointer relative"
            >
              대화식 보고서 작성하기 
              {!isApproved && <Lock className="w-4 h-4 ml-1.5 text-indigo-300 animate-pulse" />}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="#why-us"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-base shadow-xs transition duration-300 flex items-center justify-center"
            >
              핵심 특장점 살펴보기
            </a>
          </div>

          {/* Gemini API Key Configuration Section */}
          <div 
            id="api-key-config" 
            className={`mt-10 max-w-2xl mx-auto bg-white border rounded-2xl p-6 text-left transition-all duration-500 ${
              highlightConfig 
                ? "ring-4 ring-indigo-500/40 border-indigo-500 scale-[1.02] shadow-xl" 
                : "border-slate-200/80 shadow-md"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isApproved ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                }`}>
                  {isApproved ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    개인 Gemini API Key 등록 및 승인
                    {isApproved ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        개인 키 승인 완료 (이용 가능)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                        개인 키 승인 필요 (잠금 상태)
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    보안 및 리소스 전용 할당 원칙에 따라, 개인 Gemini API Key 등록 및 승인이 반드시 선행되어야 합니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              
              {/* Approval Alert Status */}
              {!isApproved ? (
                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-950 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <p className="font-extrabold text-indigo-950">⚠️ 서비스 기능 사용 제한 상태</p>
                    <p className="mt-1 font-medium text-indigo-800">
                      B2B 실시간 영업 비서의 모든 요약 및 정제 기능을 사용하기 위해서 보유 중인 개인 Gemini API Key를 아래 입력 필드에 등록하여 연동을 완료해 주세요.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <p className="font-extrabold text-emerald-950">🎉 개인 API Key 정상 승인 완료</p>
                    <p className="mt-1 text-emerald-800 font-medium">
                      보안 검증 및 전용 키 활성화 단계가 완료되었습니다. 등록된 개인 API 키를 기반으로 모든 AI 대화형 실시간 영업 분석 기능이 정상 활성화되었습니다.
                    </p>
                  </div>
                </div>
              )}

              {/* Method Detail Area */}
              <div className="bg-slate-50 p-5 border border-slate-200/60 rounded-xl space-y-4">
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase mb-2">
                    개인 API Key 입력
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3">
                    Google AI Studio에서 발급받은 <span className="font-mono text-slate-700 bg-slate-200 px-1 py-0.5 rounded">AIzaSy</span>로 시작하는 API 키를 연동합니다. 이 키는 브라우저 내부 스토리지에만 안전하게 보관됩니다.
                  </p>
                  
                  <div className="relative rounded-lg shadow-xs">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        if (verificationResult) setVerificationResult(null);
                      }}
                      placeholder="AIzaSy로 시작하는 API 키를 입력하세요..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs rounded-lg transition duration-200 pr-10 text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  {localStorage.getItem("custom_gemini_api_key") && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      등록된 키 해제 및 삭제
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleVerifyAndSaveKey}
                    disabled={isVerifying || !apiKey.trim()}
                    className={`px-4 py-2 text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                      !apiKey.trim()
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        개인 키 검증 진행 중...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        개인 키 검증 및 승인 활성화
                      </>
                    )}
                  </button>
                </div>
              </div>

              {verificationResult && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed transition-all duration-300 ${
                  verificationResult.success 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-rose-50 border-rose-100 text-rose-800"
                }`}>
                  {verificationResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">{verificationResult.success ? "✓ 승인 성공:" : "✗ 승인 실패:"}</span> {verificationResult.message}
                  </div>
                </div>
              )}

              {/* Enter Button directly shown on approval */}
              {isApproved && (
                <div className="pt-2 animate-fade-in">
                  <button
                    type="button"
                    onClick={onStart}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition duration-300 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    승인된 세션으로 대화형 영업 보고서 시작하기 
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Quick Metrics */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left border-t border-slate-200 pt-8">
            <div className="p-2">
              <p className="text-2xl font-black text-indigo-600">0.5초</p>
              <p className="text-xs text-slate-500 font-bold mt-1">인터뷰 즉시 실시간 정제</p>
            </div>
            <div className="p-2">
              <p className="text-2xl font-black text-indigo-600">100%</p>
              <p className="text-xs text-slate-500 font-bold mt-1">마크다운 표 및 CSV 완전 호환</p>
            </div>
            <div className="p-2">
              <p className="text-2xl font-black text-indigo-600">자동 감지</p>
              <p className="text-xs text-slate-500 font-bold mt-1">수주 금액 & 확률 정밀 추출</p>
            </div>
            <div className="p-2">
              <p className="text-2xl font-black text-indigo-600">에스컬레이션</p>
              <p className="text-xs text-slate-500 font-bold mt-1">경쟁사 및 중대 클레임 자동 경고</p>
            </div>
          </div>
        </div>

        {/* Live Interactive Before & After Showcase */}
        <div className="bg-white border-y border-slate-200/80 py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI 비즈니스 워딩 교정 놀라운 비포/애프터</h2>
              <p className="text-xs md:text-sm text-slate-500 font-semibold mt-2">
                지저분한 구어체나 파편화된 정보를 단 한 줄만 말해도, AI가 전술적인 전문 표현으로 다듬어 냅니다.
              </p>
              
              {/* Scenario Tabs */}
              <div className="flex gap-2 justify-center mt-6">
                <button
                  onClick={() => setActiveTab("standard")}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${
                    activeTab === "standard" 
                      ? "bg-indigo-600 text-white border-indigo-600" 
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  🏢 일반 영업 상담 (Before/After)
                </button>
                <button
                  onClick={() => setActiveTab("claim")}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${
                    activeTab === "claim" 
                      ? "bg-rose-600 text-white border-rose-600" 
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  🚨 고객사 클레임 긴급 (Before/After)
                </button>
              </div>
            </div>

            {/* Before vs After Display Box */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Raw Memo Side */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Field Reporter Raw Notes (외근 중 거친 메모)</span>
                    <span className="px-2 py-0.5 text-[9px] bg-slate-200 text-slate-700 font-extrabold rounded-md uppercase">BEFORE</span>
                  </div>
                  <p className="text-sm font-medium text-slate-600 bg-white p-4 rounded-xl border border-slate-100 shadow-xs leading-relaxed min-h-[160px] select-text">
                    "{currentSample.before}"
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-500 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  실제 영업사원이 타이핑하기 쉬운 자연스러운 하소연식 구어체
                </div>
              </div>

              {/* Conversion Arrow indicator */}
              <div className="lg:col-span-2 flex flex-col justify-center items-center py-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5 animate-spin" />
                </div>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-2">AI Standardizing</p>
              </div>

              {/* Refined Enterprise CRM Data Side */}
              <div className="lg:col-span-5 bg-indigo-50/20 border border-indigo-100 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Enterprise CRM Structured Record (실무 보고 규격)</span>
                    <span className="px-2 py-0.5 text-[9px] bg-indigo-600 text-white font-extrabold rounded-md uppercase tracking-wider">AFTER</span>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[11px] leading-relaxed">
                      <span className="font-extrabold text-slate-400 block mb-0.5 uppercase tracking-wide">영업 목적 (Purpose)</span>
                      <p className="bg-white px-3 py-2 rounded-lg border border-indigo-50 font-bold text-slate-800 shadow-xs">
                        {currentSample.after.purpose}
                      </p>
                    </div>

                    <div className="text-[11px] leading-relaxed">
                      <span className="font-extrabold text-slate-400 block mb-0.5 uppercase tracking-wide">결과 및 상담내용 (Outcome)</span>
                      <p className="bg-white px-3 py-2 rounded-lg border border-indigo-50 font-bold text-slate-800 shadow-xs">
                        {currentSample.after.result}
                      </p>
                    </div>

                    <div className="text-[11px] leading-relaxed">
                      <span className="font-extrabold text-slate-400 block mb-0.5 uppercase tracking-wide">파이프라인 (Pipeline)</span>
                      <p className="bg-white px-3 py-2 rounded-lg border border-indigo-50 font-bold text-indigo-700 shadow-xs">
                        {currentSample.after.pipeline}
                      </p>
                    </div>

                    <div className="text-[11px] leading-relaxed">
                      <span className="font-extrabold text-slate-400 block mb-0.5 uppercase tracking-wide">Action Plan / 후속 대응</span>
                      <p className="bg-white px-3 py-2 rounded-lg border border-indigo-50 font-bold text-orange-700 shadow-xs">
                        {currentSample.after.action}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-100/80 flex items-center gap-2.5 text-xs text-indigo-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  보고를 바로 올릴 수 있는 엔터프라이즈 기안 형식
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why B2B CRM Reporter (Key Strengths Grid) */}
        <div id="why-us" className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">이 웹앱이 강력하고 매력적인 4가지 이유</h2>
            <p className="text-sm text-slate-500 font-semibold mt-2">구형 ERP/CRM에 수동으로 텍스트를 기재하던 지루한 과거는 끝났습니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition duration-300 flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg leading-tight">대화형 연속 질의응답 루프</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Interactive Chat Workflow</p>
                <p className="text-slate-600 text-[13px] leading-relaxed mt-2.5 font-medium">
                  보고서 형식에 맞춰 복잡한 빈칸을 직접 손으로 메울 필요가 없습니다. AI 봇이 실시간으로 던지는 1:1 질문에 한 개씩 가볍게 답하기만 하세요.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition duration-300 flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg leading-tight">지능형 수주 파이프라인 예측</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Financial & Probability Tracker</p>
                <p className="text-slate-600 text-[13px] leading-relaxed mt-2.5 font-medium">
                  사용자의 한글 금액 표현("칠천만원 정도", "삼억오천")과 확률 예측("가능성이 꽤 높아 80%")을 기가 막히게 분리해 정확한 데이터 규격으로 적재합니다.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition duration-300 flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg leading-tight">긴급 리스크 위협 선제적 포착</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Auto Escalation Alert</p>
                <p className="text-slate-600 text-[13px] leading-relaxed mt-2.5 font-medium">
                  대화 내용 중 고객 이탈 경고, 가격 시비, 단가 협상 불통, 경쟁사 진입 정황을 자동 분석하여 대시보드에 'High Risk' 긴급 에스컬레이션을 실시간 활성화합니다.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition duration-300 flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg leading-tight">마크다운 표 변환 및 원클릭 복사/다운로드</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Enterprise Raw Export Format</p>
                <p className="text-slate-600 text-[13px] leading-relaxed mt-2.5 font-medium">
                  작성이 완료된 보고 데이터는 원클릭 마크다운 테이블(Markdown Table)로 최종 추출됩니다. 곧바로 드래그하거나 다운로드하여 이메일, 슬랙, 사내 ERP에 즉시 통합하세요.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Persona recommendation */}
        <div className="bg-slate-100/60 border-t border-slate-200/80 py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">이런 분들께 가장 필요합니다!</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 text-left">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xl">🚗</span>
                <h4 className="font-black text-slate-900 text-[14px] mt-3">이동이 잦은 필드 세일즈</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  거래처 방문 후 운전 직전, 또는 퇴근길 버스 안에서 말 한마디로 보고서 초안 작성을 끝내고 싶은 영업맨
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xl">📝</span>
                <h4 className="font-black text-slate-900 text-[14px] mt-3">품격이 필요한 신입 영업사원</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  고객사의 퉁명스럽고 지저분한 요소를 부장님께 올릴 때 어떻게 격식 있고 우아한 용어로 치환해야 할지 늘 골머리 썩는 주니어
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xl">📊</span>
                <h4 className="font-black text-slate-900 text-[14px] mt-3">신속한 관리가 필요한 영업 임원</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  팀원들이 보낸 일지 속에서 수주 파이프라인 정합성과 긴급 리스크를 매일 퇴근 전에 요약해 받고 싶은 관리직 팀장/임원
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Start Trial Footer Area */}
        <div className="bg-white py-16 px-6 border-t border-slate-200/80 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-black text-slate-950 tracking-tight">지체하지 말고 지금 직접 경험해 보세요</h2>
            <p className="text-slate-600 text-sm mt-3 font-semibold">
              별도의 회원가입 없이 즉시 대화를 통해 나만의 정교한 B2B 영업 실적 일지를 만들고 기안서를 획득해 보세요.
            </p>
            <div className="mt-8">
              <button
                onClick={handleStartWithCheck}
                className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-base shadow-lg shadow-indigo-200 hover:shadow-indigo-400 transition-all duration-300 flex items-center justify-center gap-2 mx-auto cursor-pointer group"
              >
                무료 체험 및 영업 비서 시작하기 
                {!isApproved && <Lock className="w-4 h-4 text-indigo-300 animate-pulse" />}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Footer information */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 text-center px-4">
        <p className="font-semibold text-slate-300">B2B CRM Hybrid AI Smart Report Assistant Platform</p>
        <p className="text-[10px] text-slate-500 mt-1 font-mono">
          Powered by Gemini 2.5 Flash Enterprise Server Integration • Pretendard Font Unified
        </p>
        <p className="text-[10px] text-slate-600 mt-3">&copy; 2026 CRM Hybrid. All rights reserved.</p>
      </footer>

      {/* Access Blocked Modal */}
      {showBlockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 max-w-md w-full shadow-2xl transform transition-transform duration-300 scale-100 animate-scale-up text-left">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <Lock className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg leading-tight">API 사용 권한 승인 대기</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Gemini API Key Required</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <p className="text-slate-600 text-[13px] leading-relaxed font-semibold">
                B2B 영업 구조화 비서의 모든 인공지능 기능(대화식 피드백 및 보고서 기안화)을 잠금 해제하려면 <span className="text-indigo-600 font-black">API 승인</span>이 완료되어야 합니다.
              </p>
              <p className="text-slate-500 text-xs leading-relaxed">
                승인 페이지에서 보유하신 개인 Gemini API 키를 등록하여 검증을 완료해 주시면 즉각 무제한 사용 권한이 부여됩니다.
              </p>

              <div className="flex flex-col gap-2 pt-3">
                <button
                  type="button"
                  onClick={scrollToConfig}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  API 설정 및 승인 하러 가기
                </button>
                <button
                  type="button"
                  onClick={() => setShowBlockedModal(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  창 닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
