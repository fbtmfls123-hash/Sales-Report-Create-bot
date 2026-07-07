import React, { useState, useEffect } from "react";
import { ClientReport, ReportType } from "../types";
import { 
  Building2, 
  Copy, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  FileText, 
  RefreshCw,
  AlertTriangle,
  Send,
  Plus,
  Key,
  Database,
  Activity,
  Trash2,
  Clock,
  History,
  FileCheck
} from "lucide-react";

interface ReportDashboardProps {
  reportType: string;
  clients: ClientReport[];
  isCompleted: boolean;
  onReset: () => void;
}

export default function ReportDashboard({ 
  reportType, 
  clients, 
  isCompleted, 
  onReset 
}: ReportDashboardProps) {
  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState(false);

  // Accumulated states from localStorage
  const [apiKeyLogs, setApiKeyLogs] = useState<any[]>([]);
  const [accumulatedReports, setAccumulatedReports] = useState<any[]>([]);

  // Reload logs whenever mounts or completion changes
  useEffect(() => {
    try {
      const logs = JSON.parse(localStorage.getItem("crm_api_key_logs") || "[]");
      const reports = JSON.parse(localStorage.getItem("crm_accumulated_reports") || "[]");
      setApiKeyLogs(logs);
      setAccumulatedReports(reports);
    } catch (e) {
      console.error("Failed to load accumulated data:", e);
    }
  }, [isCompleted, clients]);

  const handleClearHistory = () => {
    if (window.confirm("B2B 누적 보고 데이터 및 API 연동 승인 로그를 모두 초기화하시겠습니까?")) {
      localStorage.removeItem("crm_accumulated_reports");
      localStorage.removeItem("crm_api_key_logs");
      setApiKeyLogs([]);
      setAccumulatedReports([]);
    }
  };

  // Helper to parse probability from string
  const parseProbability = (probStr?: string) => {
    if (!probStr) return 50;
    const match = probStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 50;
  };

  // Helper to parse amount from string
  const parseAmount = (amountStr?: string) => {
    if (!amountStr) return 0.5;
    if (amountStr.includes("억")) {
      const match = amountStr.match(/(\d+(?:\.\d+)?)/);
      if (match) return parseFloat(match[1]);
    }
    if (amountStr.includes("천")) {
      const match = amountStr.match(/(\d+(?:\.\d+)?)/);
      if (match) return parseFloat(match[1]) / 10;
    }
    return 0.5;
  };

  const getReportTypeName = (type: string) => {
    switch (type) {
      case "1": return "일일 영업보고서 (신규 고객사 중심)";
      case "2": return "일일 영업보고서 (기존 고객사 중심)";
      case "3": return "주간 실적 및 파이프라인 보고서";
      case "4": return "월간 어카운트 리뷰";
      case "5": return "고객사 클레임/리스크 긴급 보고";
      default: return type || "맞춤 영업보고서";
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getPeriodText = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    if (reportType === "3") {
      // Weekly: last 7 days to today
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lyyyy = lastWeek.getFullYear();
      const lmm = String(lastWeek.getMonth() + 1).padStart(2, "0");
      const ldd = String(lastWeek.getDate()).padStart(2, "0");
      return `${lyyyy}-${lmm}-${ldd} ~ ${yyyy}-${mm}-${dd} (금주 주간)`;
    } else if (reportType === "4") {
      return `${yyyy}년 ${today.getMonth() + 1}월 (당월 어카운트)`;
    } else {
      return `${yyyy}-${mm}-${dd} (일간)`;
    }
  };

  // Generate the clean markdown requested by [Output Format]
  const generateMarkdown = () => {
    let md = `### [영업 실적 보고서]\n`;
    md += `- **보고 유형**: ${getReportTypeName(reportType)}\n`;
    md += `- **작성 일자**: ${getTodayDate()}\n`;
    md += `- **활동 기준일/기간**: ${getPeriodText()}\n`;
    md += `- **보고 건수**: ${clients.length}건\n\n`;

    md += `| 고객사/담당자 | 영업 유형(목적) | 주요 상담 내용 및 결과 (실무 워딩) | 파이프라인 (금액/수주확률 %) | 특이사항 (경쟁사/이슈) | 향후 Action Plan (기한) |\n`;
    md += `|---|---|---|---|---|---|\n`;

    clients.forEach((c) => {
      const purposeText = c.jargon?.purpose || c.purpose || "미정";
      const resultText = c.jargon?.result || c.result || "미결정";
      
      let pipelineText = "미확인";
      if (c.jargon?.pipeline) {
        pipelineText = c.jargon.pipeline.replace(/\n/g, "<br>");
      } else if (c.dealAmount || c.dealProbability) {
        pipelineText = `금액: ${c.dealAmount || "미확인"}<br>확률: ${c.dealProbability || "미확인"}`;
      }

      const outlierText = c.jargon?.outlier || c.outlier || "특이사항 없음";
      const actionText = c.jargon?.action || "차주 조율 예정";

      md += `| ${c.name}/${c.person || "담당자 미정"} | ${purposeText} | ${resultText} | ${pipelineText} | ${outlierText} | ${actionText} |\n`;
    });

    md += `\n`;

    // Find the highest severity risk/escalation
    let riskSummary = "특이사항 없음 (정상 범위 내 관리 중)";
    const claimClients = clients.filter(c => c.claimSeverity && c.claimSeverity !== "경미");
    if (claimClients.length > 0) {
      const highest = claimClients.reduce((prev, current) => {
        const severityMap: { [key: string]: number } = { "매우 심각": 4, "심각": 3, "보통": 2, "경미": 1 };
        const prevVal = severityMap[prev.claimSeverity || ""] || 0;
        const curVal = severityMap[current.claimSeverity || ""] || 0;
        return curVal > prevVal ? current : prev;
      });
      riskSummary = `[${highest.name}] 심각도 '${highest.claimSeverity}' 클레임 감지. 원인: ${highest.purpose || "이슈 발생"}. 긴급 1차 조치 후 본사 지원 대기 중.`;
    } else {
      // Find competitor warning or custom claims
      const riskWithCompetitors = clients.find(c => c.outlier && c.outlier.includes("경쟁사"));
      if (riskWithCompetitors) {
        riskSummary = `[${riskWithCompetitors.name}] 타사 진입 정황 포착에 따른 시장 점유 위험 감지. 차별화 대응 제안 마련 시급.`;
      }
    }

    // Best Action Plan
    const firstAction = clients.map(c => c.jargon?.action || "후속 대응 조치 예정").filter(Boolean)[0] || "전사 영업 활동 후속 F/U 수립";

    md += `| 종합 현황 | 내용 |\n`;
    md += `|---|---|\n`;
    md += `| 최우선 리스크/에스컬레이션 | ${riskSummary} |\n`;
    md += `| 금주/익일 우선순위 | ${firstAction} |\n`;

    return md;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncCRM = () => {
    setSynced(true);
    setTimeout(() => setSynced(false), 3000);
  };

  const downloadAsCSV = () => {
    let csvContent = "\ufeff"; // BOM for Korean Excel parsing
    csvContent += "고객사/담당자,영업유형,상담결과,파이프라인 금액,수주확률,특이사항,Action Plan\n";
    clients.forEach((c) => {
      const p = (c.jargon?.purpose || c.purpose || "").replace(/"/g, '""');
      const r = (c.jargon?.result || c.result || "").replace(/"/g, '""');
      const amount = (c.dealAmount || "미확인").replace(/"/g, '""');
      const prob = (c.dealProbability || "미확인").replace(/"/g, '""');
      const out = (c.jargon?.outlier || c.outlier || "").replace(/"/g, '""');
      const act = (c.jargon?.action || "").replace(/"/g, '""');
      csvContent += `"${c.name}/${c.person}","${p}","${r}","${amount}","${prob}","${out}","${act}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `B2B_영업보고서_${getTodayDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find current priority status
  const getHighRiskStatus = () => {
    const claimClients = clients.filter(c => c.claimSeverity && c.claimSeverity !== "경미");
    if (claimClients.length > 0) {
      const highest = claimClients[0];
      return `${highest.name} - 심각도 '${highest.claimSeverity}'`;
    }
    const competitorWarning = clients.find(c => c.outlier && c.outlier.includes("경쟁사"));
    if (competitorWarning) {
      return `${competitorWarning.name} - 경쟁사 진입 위협`;
    }
    return "특이사항 없음 (정상 범위)";
  };

  const getNextActionStatus = () => {
    const actionClient = clients.find(c => c.jargon?.action);
    if (actionClient && actionClient.jargon?.action) {
      return actionClient.jargon.action;
    }
    if (clients.length > 0) {
      return "영업 F/U 및 성과 분석 대기";
    }
    return "대기 중";
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col h-full overflow-hidden text-slate-800 antialiased">
      {/* Title & Stats */}
      <div className="flex justify-between items-start border-b border-slate-200/80 pb-5 mb-5 shrink-0 flex-wrap gap-4">
        <div>
          <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-1.5 block">B2B CRM Live Database</span>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 tracking-tight mt-0.5">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            영업 실적 보고서 및 CRM 데이터
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs' : 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs'} no-print-badge`}>
              {isCompleted ? "작성 완료" : "작성 중"}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-4 shrink-0 flex-wrap">
          {clients.length > 0 && (
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer no-print-btn hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileCheck className="w-4 h-4" />
              PDF 보고서 내보내기 (인쇄)
            </button>
          )}
          <div className="flex gap-5 text-right">
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Date</p>
              <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">{getTodayDate()}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Cases</p>
              <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">{clients.length > 0 ? `${clients.length}건 수집` : "-"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Preview Content */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
        {clients.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center my-auto min-h-[300px]">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50/50 flex items-center justify-center mb-5 text-indigo-500 border border-indigo-100/60 shadow-xs">
              <Building2 className="w-7 h-7" />
            </div>
            <p className="text-slate-800 font-extrabold text-base leading-relaxed">
              영업 인터뷰가 진행되면<br />여기에 실시간으로 비즈니스 데이터가 변환되어 쌓입니다.
            </p>
            <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
              왼쪽 대화창의 질문에 순서대로 답하시면, AI가 지저분한 구어체 답변을 정제하여 엔터프라이즈 CRM 규격의 보고서 데이터로 자동 적재합니다.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metadata Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70 shadow-xs">
              <div>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Report Type</p>
                <p className="text-xs font-bold text-slate-800 mt-1 leading-tight whitespace-normal break-words">{getReportTypeName(reportType)}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Reporting Date</p>
                <p className="text-xs font-bold text-slate-800 mt-1 leading-tight">{getTodayDate()}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Period Scope</p>
                <p className="text-xs font-bold text-slate-800 mt-1 leading-tight whitespace-normal break-words">{getPeriodText()}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Data Records</p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {clients.length} Active Row{clients.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Priority Status Cards (Fully wrapped - No text truncation) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-orange-50/20 rounded-2xl border border-orange-100 p-4 flex gap-4 items-start shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold text-orange-700 uppercase tracking-wider">High Risk / Alert</p>
                  <p className="text-[13px] font-bold text-slate-800 mt-1 whitespace-normal break-words leading-snug">{getHighRiskStatus()}</p>
                </div>
              </div>

              <div className="bg-emerald-50/20 rounded-2xl border border-emerald-100 p-4 flex gap-4 items-start shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">Next Priority Action</p>
                  <p className="text-[13px] font-bold text-slate-800 mt-1 whitespace-normal break-words leading-snug">{getNextActionStatus()}</p>
                </div>
              </div>
            </div>

            {/* Sales Activity Report Executive Summary Card (영업활동 리포트 종합 요약) */}
            <div className="bg-gradient-to-r from-indigo-50/60 to-blue-50/40 rounded-2xl border border-indigo-100/80 p-5 space-y-4 shadow-xs relative">
              <div className="flex justify-between items-center border-b border-indigo-100/50 pb-2.5">
                <span className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  영업활동 리포트 종합 요약 (Executive Activity Summary)
                </span>
                <span className="text-[9px] text-indigo-500 font-bold bg-indigo-100/60 px-2.5 py-0.5 rounded-full">AI 정제 데이터 기반</span>
              </div>
              <div className="space-y-3 text-slate-700 text-xs leading-relaxed">
                <p className="font-semibold text-slate-800 text-[13px]">
                  본 보고서는 <span className="text-indigo-600 font-bold">{getTodayDate()} 기준</span> 영업활동 성과를 요약한 종합 리포트입니다. {clients.length}개사의 주요 활동 내역 및 파이프라인 흐름을 체계적으로 수집/정제하였습니다.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div className="bg-white/80 p-3.5 rounded-xl border border-indigo-50 shadow-2xs space-y-2">
                    <span className="text-[10px] font-extrabold text-indigo-600 uppercase block tracking-wider">핵심 성과 및 진척도</span>
                    <ul className="space-y-1.5 list-disc pl-4 text-slate-600 font-medium">
                      <li>수집된 유효 파이프라인 건수: <strong className="text-slate-800">{clients.length}건</strong></li>
                      <li>평균 수주 제안 성공률: <strong className="text-indigo-600 font-bold">{Math.round(clients.reduce((acc, c) => acc + parseProbability(c.jargon?.pipeline || c.dealProbability), 0) / (clients.length || 1))}%</strong></li>
                      <li>주요 고객사 현황: <span className="font-semibold text-slate-700">{clients.map(c => c.name).filter(Boolean).join(", ")}</span></li>
                    </ul>
                  </div>

                  <div className="bg-white/80 p-3.5 rounded-xl border border-indigo-50 shadow-2xs space-y-2">
                    <span className="text-[10px] font-extrabold text-orange-600 uppercase block tracking-wider font-bold">주요 위협 및 조치 사항</span>
                    <ul className="space-y-1.5 list-disc pl-4 text-slate-600 font-medium">
                      <li className="text-orange-700 font-bold">에스컬레이션 리스크: <span className="text-slate-700 font-medium">{getHighRiskStatus()}</span></li>
                      <li className="text-emerald-700 font-bold">차주 최우선 Action: <span className="text-slate-700 font-medium">{getNextActionStatus()}</span></li>
                      <li>전략 방향: 고객 맞춤형 실무 제안서 조기 송부 및 추가 F/U 미팅을 통한 수주 확정 유도</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================== */}
            {/* INFOGRAPHIC PORTION (VISUAL ALIGNMENT FROM IMAGE) */}
            {/* ========================================== */}
            <div className="bg-amber-50/10 border border-slate-200/60 rounded-3xl p-6 space-y-8 shadow-xs relative overflow-hidden">
              {/* Background elegant line grid */}
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
              
              {/* Salford & Co style header */}
              <div className="border-b border-slate-300 pb-4 flex justify-between items-end relative flex-wrap gap-4">
                <div className="text-left">
                  <p className="font-mono text-[9px] font-extrabold tracking-widest text-slate-400 uppercase">SALFORD & CO. | 2026 CRM DIVISION</p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5 uppercase">Monthly Progress Report</h3>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-mono font-extrabold tracking-widest text-indigo-600 uppercase flex items-center justify-end gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                    BEST SEO & CRM INSIGHTS
                  </p>
                  <p className="text-[10px] font-sans font-semibold text-slate-500 mt-1">
                    → VISUAL METRICS FOR THE CONVERSATION ACTIVE
                  </p>
                </div>
              </div>

              {/* Sub-line description from the image */}
              <div className="text-center font-serif italic text-xs text-slate-500 -mt-4 pb-2 border-b border-slate-100">
                "A visual representation of key performance metrics and achievements for the active B2B accounts."
              </div>

              {/* Infographic Bento Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                
                {/* 1. Overall Progress Overview (Orange Pill, Col span 5) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 pt-8 relative shadow-xs flex flex-col justify-between">
                  {/* Floating Pill Header */}
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border-2 border-white whitespace-nowrap">
                    Overall Progress Overview
                  </div>
                  
                  <p className="text-[10px] text-slate-400 text-center font-bold mb-4">Visualize the overall progress percentage over the months.</p>
                  
                  {/* Arc gauges */}
                  <div className="grid grid-cols-2 gap-4 my-auto">
                    {[
                      { label: "대화 완료도", value: isCompleted ? 100 : Math.min(clients.length * 30, 90), color: "text-orange-500" },
                      { label: "평균 성공확률", value: Math.round(clients.reduce((acc, c) => acc + parseProbability(c.jargon?.pipeline || c.dealProbability), 0) / (clients.length || 1)), color: "text-orange-600" },
                      { label: "워딩 정제율", value: Math.round((clients.filter(c => c.jargon).length / (clients.length || 1)) * 100), color: "text-indigo-600" },
                      { label: "리스크 방어율", value: clients.some(c => c.claimSeverity === "매우 심각" || c.claimSeverity === "심각") ? 65 : 95, color: "text-indigo-500" }
                    ].map((g, gi) => {
                      const radius = 24;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - (g.value / 100) * circumference;
                      return (
                        <div key={gi} className="flex flex-col items-center justify-center p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
                          <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="32" cy="32" r={radius} className="stroke-slate-200 fill-none" strokeWidth="4.5" />
                              <circle 
                                cx="32" 
                                cy="32" 
                                r={radius} 
                                className={`fill-none stroke-current ${g.color}`} 
                                strokeWidth="4.5" 
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-xs font-black text-slate-800">{g.value}%</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-600 mt-2">{g.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Project Milestones Achieved (Blue Pill, Col span 7) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 pt-8 relative shadow-xs flex flex-col justify-between">
                  {/* Floating Pill Header */}
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border-2 border-white whitespace-nowrap">
                    Project Milestones Achieved
                  </div>
                  
                  <p className="text-[10px] text-slate-400 text-center font-bold mb-4">Track the status of B2B project milestones.</p>
                  
                  {/* Progress Items */}
                  <div className="space-y-3.5 my-auto">
                    {[
                      { name: "Milestone 1: 기초 요건 수집 및 분석", status: "Completed", value: 100, color: "bg-blue-600" },
                      { name: "Milestone 2: AI 비즈니스 정제", status: isCompleted ? "Completed" : "In Progress", value: isCompleted ? 100 : 60, color: isCompleted ? "bg-blue-600" : "bg-orange-500 animate-pulse" },
                      { name: "Milestone 3: 전사 ERP 실시간 동기화", status: synced ? "Completed" : isCompleted ? "In Progress" : "Pending", value: synced ? 100 : isCompleted ? 40 : 10, color: synced ? "bg-blue-600" : "bg-orange-500" }
                    ].map((m, mi) => (
                      <div key={mi} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold text-slate-700">
                          <span>{m.name}</span>
                          <span className={m.status === "Completed" ? "text-blue-600" : "text-orange-500"}>
                            Status: {m.status}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
                          <div className={`h-full rounded-full transition-all duration-500 ${m.color}`} style={{ width: `${m.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Key Performance Indicators (KPIs) (Blue Pill, Col span 6) */}
                <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-5 pt-8 relative shadow-xs flex flex-col justify-between min-h-[220px]">
                  {/* Floating Pill Header */}
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border-2 border-white whitespace-nowrap">
                    Key Performance Indicators (KPIs)
                  </div>
                  
                  <p className="text-[10px] text-slate-400 text-center font-bold mb-4">Compare targeted and actual values for key indicators.</p>
                  
                  {/* Column charts side-by-side */}
                  <div className="flex justify-around items-end h-28 pt-4 border-b border-slate-200">
                    {[
                      { label: "계약 수집 (건)", target: 50, actual: Math.min((clients.length / 5) * 100, 100) },
                      { label: "예상 매출 (억)", target: 70, actual: Math.min((clients.reduce((acc, c) => acc + parseAmount(c.jargon?.pipeline || c.dealAmount), 0) / 3.0) * 100, 100) },
                      { label: "고객 합의 (%)", target: 80, actual: Math.round(clients.reduce((acc, c) => acc + parseProbability(c.jargon?.pipeline || c.dealProbability), 0) / (clients.length || 1)) }
                    ].map((k, ki) => (
                      <div key={ki} className="flex flex-col items-center w-1/3">
                        <div className="flex gap-1.5 items-end h-20 w-full justify-center">
                          <div className="w-3.5 bg-orange-500 rounded-t-sm transition-all duration-500" style={{ height: `${k.target}%` }} />
                          <div className="w-3.5 bg-blue-600 rounded-t-sm transition-all duration-500" style={{ height: `${k.actual}%` }} />
                        </div>
                        <span className="text-[9px] font-black text-slate-600 text-center mt-1 truncate w-full">{k.label}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-center gap-4 text-[9px] font-black mt-2 text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-orange-500 rounded-xs" /> Target</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-600 rounded-xs" /> Actual</span>
                  </div>
                </div>

                {/* 4. Team Productivity (Orange Pill, Col span 6) */}
                <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-5 pt-8 relative shadow-xs flex flex-col justify-between">
                  {/* Floating Pill Header */}
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border-2 border-white whitespace-nowrap">
                    Team Productivity
                  </div>
                  
                  <p className="text-[10px] text-slate-400 text-center font-bold mb-3">Visualize individual team members' productivity.</p>
                  
                  {/* Team Avatars with Progress bars */}
                  <div className="space-y-3 my-auto">
                    {[
                      { name: "Kunal Sushil", progress: 20, initials: "KS", bg: "bg-orange-100 text-orange-700" },
                      { name: "Juliana Silva", progress: 25, initials: "JS", bg: "bg-blue-100 text-blue-700" },
                      { name: "Aaron Loeb", progress: 18, initials: "AL", bg: "bg-indigo-100 text-indigo-700" },
                      { name: "Teddy Yu", progress: 22, initials: "TY", bg: "bg-emerald-100 text-emerald-700" }
                    ].map((t, ti) => (
                      <div key={ti} className="flex items-center gap-2.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${t.bg}`}>
                          {t.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-[10px] font-black text-slate-700 leading-none">
                            <span className="truncate">{t.name}</span>
                            <span>{t.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1 p-0">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${t.progress * 4}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Budget vs. Actual Expenses (Orange Pill, Col span 6) */}
                <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-5 pt-8 relative shadow-xs flex flex-col justify-between min-h-[220px]">
                  {/* Floating Pill Header */}
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border-2 border-white whitespace-nowrap">
                    Budget vs. Actual Expenses
                  </div>
                  
                  <p className="text-[10px] text-slate-400 text-center font-bold mb-4">Compare budgeted and actual expenses for different categories.</p>
                  
                  <div className="flex justify-around items-end h-28 pt-4 border-b border-slate-200">
                    {[
                      { label: "Marketing", budget: 35, actual: 50 },
                      { label: "Operations", budget: 45, actual: 75 },
                      { label: "Salaries", budget: 60, actual: 95 }
                    ].map((b, bi) => (
                      <div key={bi} className="flex flex-col items-center w-1/3">
                        <div className="flex gap-1.5 items-end h-20 w-full justify-center">
                          <div className="w-4 bg-orange-500 rounded-t-sm" style={{ height: `${b.budget}%` }} />
                          <div className="w-4 bg-blue-600 rounded-t-sm" style={{ height: `${b.actual}%` }} />
                        </div>
                        <span className="text-[9px] font-black text-slate-600 mt-1">{b.label}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-center gap-4 text-[9px] font-black mt-2 text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-orange-500 rounded-xs" /> Budget</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-600 rounded-xs" /> Actual</span>
                  </div>
                </div>

                {/* 6. Customer Acquisition Channels (Blue Pill, Col span 6) */}
                <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-5 pt-8 relative shadow-xs flex flex-col justify-between">
                  {/* Floating Pill Header */}
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border-2 border-white whitespace-nowrap">
                    Customer Acquisition Channels
                  </div>
                  
                  <p className="text-[10px] text-slate-400 text-center font-bold mb-3">Analyze the effectiveness of customer acquisition channels.</p>
                  
                  <div className="flex items-center justify-center h-28 my-1 relative">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F97316" strokeWidth="4" strokeDasharray="45 55" strokeDashoffset="100" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#FB923C" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="55" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#2563EB" strokeWidth="4" strokeDasharray="20 80" strokeDashoffset="30" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#60A5FA" strokeWidth="4" strokeDasharray="10 90" strokeDashoffset="10" />
                    </svg>
                    
                    <div className="absolute flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-800">45%</span>
                      <span className="text-[8px] text-slate-400 font-bold leading-none">Max Slice</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[8px] font-black mt-2 text-slate-500 max-w-xs mx-auto">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-xs" /> Online Ads (45%)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-xs" /> Referrals (25%)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-600 rounded-xs" /> Social Media (20%)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-xs" /> Events (10%)</span>
                  </div>
                </div>

                {/* 7. Employee Satisfaction (Orange Pill, Col span 12) */}
                <div className="lg:col-span-12 bg-white border border-slate-200 rounded-3xl p-5 pt-8 relative shadow-xs flex flex-col md:flex-row items-center gap-6">
                  {/* Floating Pill Header */}
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border-2 border-white whitespace-nowrap">
                    Employee Satisfaction
                  </div>
                  
                  <div className="flex-1 w-full space-y-2.5">
                    <p className="text-[10px] text-slate-400 font-bold mb-1">Analyze the effectiveness of customer acquisition channels.</p>
                    {[
                      { label: "Jan", val: 80, color: "bg-blue-600" },
                      { label: "Feb", val: 85, color: "bg-blue-600" },
                      { label: "Mar", val: 90, color: "bg-blue-600" },
                      { label: "Apr", val: 75, color: "bg-blue-600" }
                    ].map((s, si) => (
                      <div key={si} className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 w-6">{s.label}</span>
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-0.5">
                          <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.val}%` }} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 w-6 text-right">{s.val / 20}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 bg-orange-50/50 border border-orange-100 rounded-2xl shrink-0 w-full md:w-44 text-center">
                    <span className="text-3xl">😊</span>
                    <p className="text-2xl font-black text-orange-600 mt-2 leading-none">4.425%</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Satisfaction Index</p>
                  </div>
                </div>

                {/* 8. Projected vs. Actual Timelines (Blue Pill, Col span 12) */}
                <div className="lg:col-span-12 bg-white border border-slate-200 rounded-3xl p-5 pt-8 relative shadow-xs flex flex-col justify-between">
                  {/* Floating Pill Header */}
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border-2 border-white whitespace-nowrap">
                    Projected vs. Actual Timelines
                  </div>
                  
                  <p className="text-[10px] text-slate-400 text-center font-bold mb-4">Track chronological schedules for next actions.</p>
                  
                  <div className="overflow-x-auto">
                    <div className="min-w-[480px] space-y-4 pt-2">
                      <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-[9px] font-black text-slate-400 text-center">
                        <div>ITEMS</div>
                        <div>FEB 12</div>
                        <div>FEB 15</div>
                        <div>MAR 18</div>
                        <div>MAR 20</div>
                        <div>APR 30</div>
                        <div>MAY 05</div>
                      </div>

                      <div className="grid grid-cols-7 items-center text-center">
                        <div className="text-[10px] font-black text-slate-600 text-left">Task 1 (초동 조치)</div>
                        <div className="col-span-6 relative h-6 flex items-center">
                          <div className="absolute left-[15%] right-[70%] h-1 bg-slate-200" />
                          <div className="absolute left-[15%] w-3 h-3 rounded-full bg-blue-600" title="Projected" />
                          <div className="absolute left-[30%] w-3 h-3 rounded-full bg-orange-500" title="Actual" />
                        </div>
                      </div>

                      <div className="grid grid-cols-7 items-center text-center">
                        <div className="text-[10px] font-black text-slate-600 text-left">Task 2 (조율 타협)</div>
                        <div className="col-span-6 relative h-6 flex items-center">
                          <div className="absolute left-[40%] right-[30%] h-1 bg-slate-200" />
                          <div className="absolute left-[45%] w-3 h-3 rounded-full bg-orange-500" />
                          <div className="absolute left-[55%] w-3 h-3 rounded-full bg-blue-600" />
                        </div>
                      </div>

                      <div className="grid grid-cols-7 items-center text-center">
                        <div className="text-[10px] font-black text-slate-600 text-left">Task 3 (전체 통합)</div>
                        <div className="col-span-6 relative h-6 flex items-center">
                          <div className="absolute left-[70%] right-[10%] h-1 bg-slate-200" />
                          <div className="absolute left-[75%] w-3 h-3 rounded-full bg-blue-600" />
                          <div className="absolute left-[85%] w-3 h-3 rounded-full bg-orange-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 text-[9px] font-black mt-3 text-slate-500 border-t border-slate-100 pt-2.5">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600" /> Projected Completion Date</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> Actual Completion Date</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Client Lists Visual Cards */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-widest">B2B CLIENTS REALTIME STREAM</h3>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">* CRM Standardized</span>
              </div>
              
              {clients.map((c, idx) => {
                const isClaimTrack = reportType === "5";
                const isCompletedRow = !!c.jargon;
                return (
                  <div 
                    key={c.id} 
                    className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden shadow-xs hover:shadow-sm ${
                      isCompletedRow 
                        ? "border-indigo-100 bg-indigo-50/5" 
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {/* Status accent glow */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${
                      isCompletedRow 
                        ? "bg-indigo-600" 
                        : isClaimTrack ? "bg-orange-500" : "bg-slate-300"
                    }`} />

                    <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 flex items-center justify-center bg-slate-100 text-[10px] font-bold rounded text-slate-700 border border-slate-200">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-[15px] font-black text-slate-900 flex items-center gap-1.5 leading-none">
                            {c.name || "고객사 정보 분석 중..."}
                            {c.person && (
                              <span className="text-xs font-semibold text-slate-500">({c.person})</span>
                            )}
                          </h4>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex gap-1.5">
                        {isClaimTrack && c.claimSeverity && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                            c.claimSeverity === "매우 심각" 
                              ? "bg-rose-50 text-rose-700 border-rose-200 shadow-xs" 
                              : c.claimSeverity === "심각" 
                              ? "bg-red-50 text-red-700 border-red-200 shadow-xs"
                              : "bg-orange-50 text-orange-700 border-orange-200 shadow-xs"
                          }`}>
                            리스크: {c.claimSeverity}
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border shadow-xs ${
                          isCompletedRow 
                            ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}>
                          {isCompletedRow ? "실무 보고용 정제 완료" : "정보 대기 중"}
                        </span>
                      </div>
                    </div>

                    {/* Report Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs text-slate-700">
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block">영업 목적 (Purpose)</span>
                        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 min-h-[38px] leading-relaxed text-slate-800 font-semibold shadow-xs">
                          {c.jargon?.purpose || c.purpose || "대화 진행을 통해 정보를 축적하고 있습니다..."}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block">상담 결과 및 성과 (Outcome)</span>
                        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 min-h-[38px] leading-relaxed text-slate-800 font-semibold shadow-xs">
                          {c.jargon?.result || c.result || "대화 진행을 통해 정보를 축적하고 있습니다..."}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block">파이프라인 예측 (Pipeline)</span>
                        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 min-h-[38px] leading-relaxed text-indigo-700 font-extrabold shadow-xs">
                          {c.jargon?.pipeline 
                            ? c.jargon.pipeline 
                            : (c.dealAmount || c.dealProbability) 
                            ? `금액: ${c.dealAmount || "미정"} / 예상 성공 확률: ${c.dealProbability || "미정"}`
                            : "분석된 금융 가치가 아직 축적되지 않았습니다."}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block">Action Plan / 후속 대응 방안</span>
                        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 min-h-[38px] leading-relaxed text-orange-700 font-extrabold shadow-xs">
                          {c.jargon?.action 
                            ? c.jargon.action 
                            : (c.outlier ? `특이사항: ${c.outlier}` : "전술적 후속 수립 대기 중")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generated Raw Markdown Table output view if completed */}
            {isCompleted && (
              <div className="mt-6 border border-indigo-100 rounded-2xl overflow-hidden bg-white relative shadow-sm">
                <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" /> 정제 완료된 실무 표 (Markdown Table Format)
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={copyToClipboard}
                      className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-bold border border-slate-200 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-indigo-600" />
                      {copied ? "복사 성공!" : "클립보드 복사"}
                    </button>
                    <button 
                      onClick={downloadAsCSV}
                      className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-bold border border-slate-200 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      CSV 다운로드
                    </button>
                  </div>
                </div>
                
                {/* Visual markdown render box */}
                <div className="p-4 overflow-x-auto text-[11px] font-mono text-slate-700 max-h-[300px] leading-relaxed custom-scrollbar selection:bg-blue-100 selection:text-blue-900 bg-slate-50 select-text">
                  <pre className="whitespace-pre-wrap">{generateMarkdown()}</pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cumulative B2B CRM Analytics & API Verification History */}
        {(accumulatedReports.length > 0 || apiKeyLogs.length > 0) && (
          <div className="mt-8 pt-8 border-t border-slate-200/80 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest block mb-1">Cumulative B2B Workspace</span>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-600" />
                  개인 API 승인 데이터 & 누적 B2B 영업 대시보드
                </h3>
              </div>
              <button
                onClick={handleClearHistory}
                className="px-3 py-1.5 text-[10px] bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg text-slate-500 font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                대시보드 데이터 초기화
              </button>
            </div>

            {/* Part 1: API 연동 승인 이력 Tracker */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Key className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black text-slate-800">개인 Gemini API Key 인증 및 호출 검증기 이력 (누적 데이터)</span>
              </div>
              
              {/* API Stat cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">
                  <span className="text-[9px] text-slate-400 font-black block">총 연동 승인 횟수</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">
                    {apiKeyLogs.filter(l => l.status === "성공").length}회 성공
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">
                  <span className="text-[9px] text-slate-400 font-black block">평균 검증 속도</span>
                  <span className="text-sm font-black text-indigo-600 mt-1 block">
                    {(() => {
                      const successes = apiKeyLogs.filter(l => l.status === "성공" && l.latency && l.latency !== "0ms");
                      if (successes.length === 0) return "N/A";
                      const avg = Math.round(successes.reduce((acc, curr) => {
                        const num = parseInt(curr.latency, 10) || 0;
                        return acc + num;
                      }, 0) / successes.length);
                      return `${avg}ms`;
                    })()}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">
                  <span className="text-[9px] text-slate-400 font-black block">최종 검증 상태</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    정상 가동 중
                  </span>
                </div>
              </div>

              {/* Log Table */}
              <div className="overflow-x-auto max-h-[160px] custom-scrollbar border border-slate-200 rounded-xl bg-white">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 font-black text-slate-600">
                      <th className="p-2.5">검증 시간</th>
                      <th className="p-2.5">입력된 Gemini API Key prefix</th>
                      <th className="p-2.5">상태</th>
                      <th className="p-2.5">응답 속도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700 font-sans">
                    {apiKeyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono text-slate-500">{log.timestamp}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-800">{log.maskedKey}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.status === "성공" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : log.status === "해제됨"
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-indigo-600">{log.latency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Part 2: 누적 파이프라인 성과 비주얼라이저 */}
            {accumulatedReports.length > 0 && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800">수집 데이터 누적 시각화 (Total Pipeline Multi-Session Analytics)</span>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">총 누적 연동 고객사</span>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-xl font-black text-slate-900">{accumulatedReports.length}</span>
                      <span className="text-xs text-slate-500 font-semibold">개사 관리됨</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">누적 영업 잠재 매출 가치</span>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-xl font-black text-indigo-600">
                        {(() => {
                          const total = accumulatedReports.reduce((sum, r) => sum + (r.dealAmountNum || 0), 0);
                          if (total === 0) return "미지정";
                          if (total >= 10000) {
                            return `${(total / 10000).toFixed(1)}억원`;
                          }
                          return `${total.toLocaleString()}만원`;
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">우량 계약 비중 (성공률 ≥ 70%)</span>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-xl font-black text-emerald-600">
                        {(() => {
                          const total = accumulatedReports.length;
                          const highProb = accumulatedReports.filter(r => r.dealProbability >= 70).length;
                          return `${Math.round((highProb / total) * 100)}%`;
                        })()}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">
                        ({accumulatedReports.filter(r => r.dealProbability >= 70).length}건)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accumulated Client List */}
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Accumulated Clients Record Tracker</p>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white max-h-[250px] custom-scrollbar">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 font-black text-slate-600">
                          <th className="p-3">수집 일자</th>
                          <th className="p-3">고객사 / 담당자</th>
                          <th className="p-3">영업 목적 및 제안내용</th>
                          <th className="p-3">예상 금액 (Pipeline)</th>
                          <th className="p-3">수주 확률</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {accumulatedReports.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono text-slate-400">{r.date}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-900">{r.name}</span>
                              <span className="text-[10px] text-slate-500 block">{r.person}</span>
                            </td>
                            <td className="p-3 max-w-xs whitespace-normal break-all" title={r.purpose}>
                              <span className="font-semibold text-slate-800 block">{r.purpose}</span>
                              <span className="text-[10px] text-slate-400 block">{r.result}</span>
                            </td>
                            <td className="p-3 font-bold text-slate-800">
                              {r.dealAmountStr || "미확인"}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden p-0">
                                  <div 
                                    className={`h-full rounded-full ${
                                      r.dealProbability >= 70 
                                        ? "bg-emerald-500" 
                                        : r.dealProbability >= 40 
                                        ? "bg-indigo-500" 
                                        : "bg-amber-500"
                                    }`} 
                                    style={{ width: `${r.dealProbability}%` }} 
                                  />
                                </div>
                                <span className="font-bold text-slate-700 font-mono">{r.dealProbability}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Synchronized Trigger Footer */}
      {isCompleted && (
        <div className="mt-4 pt-4 border-t border-slate-200/80 shrink-0 flex gap-3 flex-wrap">
          <button
            onClick={handleSyncCRM}
            disabled={synced}
            className={`flex-1 py-3.5 px-5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow ${
              synced 
                ? "bg-emerald-600 text-white" 
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {synced ? (
              <>
                <CheckCircle2 className="w-5 h-5 animate-bounce" />
                기업 CRM / ERP 데이터베이스 즉시 전송 및 동기화 완료
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                기업 CRM / ERP 데이터베이스로 실시간 즉시 전송
              </>
            )}
          </button>
          
          <button
            onClick={onReset}
            className="px-5 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold transition cursor-pointer shadow-xs"
          >
            새 보고서 작성
          </button>
        </div>
      )}
    </div>
  );
}
