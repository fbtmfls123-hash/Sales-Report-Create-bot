import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  Send, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  RefreshCw, 
  User, 
  ArrowRight, 
  MessageSquare, 
  ShieldAlert, 
  FileCheck,
  ChevronRight,
  TrendingUp,
  Cpu,
  History,
  Info,
  Sparkles
} from "lucide-react";
import { ClientReport, ChatMessage, ReportType, RefinedJargon } from "./types";
import ReportDashboard from "./components/ReportDashboard";
import LandingPage from "./components/LandingPage";

export default function App() {
  // State variables for report data
  const [reportType, setReportType] = useState<string>("1");
  const [clients, setClients] = useState<ClientReport[]>([]);
  const [currentClientIndex, setCurrentClientIndex] = useState<number>(0);
  
  // Dialog state machine
  // 'REPORT_TYPE' -> 'CLIENT_COUNT' -> 'CONFIRM_PARSED_CLIENTS' -> 'CLIENT_INTERVIEW_LOOP' -> 'REFINING_JARGON' -> 'CONFIRMATION' -> 'FINAL_OUTPUT'
  const [currentStep, setCurrentStep] = useState<string>("REPORT_TYPE");
  
  // Client interview sub-steps: 'NAME_PERSON' -> 'SEVERITY' -> 'PURPOSE' -> 'RESULT' -> 'RECONFIRM_VALUE' -> 'OUTLIER'
  const [currentClientStep, setCurrentClientStep] = useState<string>("NAME_PERSON");
  const [reconfirmAttempts, setReconfirmAttempts] = useState<number>(0);

  // Edit / correction state variables
  const [editingClientIndex, setEditingClientIndex] = useState<number | null>(null);
  const [correctionMode, setCorrectionMode] = useState<"NONE" | "VALUE_PROB" | "CONTENT">("NONE");

  // UI state variables
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Ref for automatic scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Save reports to accumulated logs in localStorage when completed
  useEffect(() => {
    if (isCompleted && clients.length > 0) {
      try {
        const storedStr = localStorage.getItem("crm_accumulated_reports") || "[]";
        const accumulated = JSON.parse(storedStr);
        
        // Create formatted records to accumulate
        const newReports = clients.map(client => {
          let parsedProb = 0;
          let parsedAmt = 0;
          
          if (client.dealProbability) {
            const match = client.dealProbability.match(/\d+/);
            if (match) parsedProb = parseInt(match[0], 10);
          }
          if (client.dealAmount) {
            const match = client.dealAmount.replace(/,/g, "").match(/\d+/);
            if (match) parsedAmt = parseInt(match[0], 10);
          }

          return {
            id: client.id || `client-${Date.now()}-${Math.random()}`,
            name: client.name || "고객사명 미지정",
            person: client.person || "담당자 미확인",
            purpose: client.jargon?.purpose || client.purpose || "영업 목적 미지정",
            result: client.jargon?.result || client.result || "영업 결과 미작성",
            dealAmountStr: client.dealAmount || "",
            dealAmountNum: parsedAmt,
            dealProbability: parsedProb,
            claimSeverity: client.claimSeverity || "경미",
            date: new Date().toLocaleDateString("ko-KR"),
            timestamp: Date.now()
          };
        });

        // Merge and avoid duplicate client IDs
        const merged = [...accumulated];
        newReports.forEach(r => {
          if (!merged.some(m => m.id === r.id)) {
            merged.push(r);
          }
        });

        localStorage.setItem("crm_accumulated_reports", JSON.stringify(merged));
      } catch (e) {
        console.error("Failed to accumulate crm reports:", e);
      }
    }
  }, [isCompleted, clients]);

  // Initialize Step 1 on page load without waiting
  useEffect(() => {
    const initMessages: ChatMessage[] = [
      {
        id: "welcome-1",
        sender: "bot",
        text: "안녕하세요! B2B 실전 영업 및 CRM 데이터 고도화를 위한 '대화형 현업 영업보고서 생성 봇'입니다. 영업 담당자님의 외근 중 신속하고 정확한 정보 입력을 도와드립니다.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      },
      {
        id: "step1-q",
        sender: "bot",
        text: "작성하실 영업보고서의 유형을 알려주세요.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        options: [
          { value: "1", label: "1. 일일 영업보고서 (신규 고객사 중심)" },
          { value: "2", label: "2. 일일 영업보고서 (기존 고객사 중심)" },
          { value: "3", label: "3. 주간 실적 및 파이프라인 보고서" },
          { value: "4", label: "4. 월간 어카운트 리뷰" },
          { value: "5", label: "5. 고객사 클레임/리스크 긴급 보고" },
          { value: "6", label: "6. 직접 입력 (원하시는 보고서 유형을 적어주세요)" }
        ],
        stepId: "REPORT_TYPE"
      }
    ];
    setMessages(initMessages);
  }, []);

  // Helper to add bot messages
  const addBotMessage = (text: string, options?: Array<{ value: string; label: string }>, stepId?: string) => {
    const newMsg: ChatMessage = {
      id: `bot-${Date.now()}-${Math.random()}`,
      sender: "bot",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      options,
      stepId
    };
    setMessages(prev => [...prev, newMsg]);
  };

  // Helper to add user messages
  const addUserMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages(prev => [...prev, newMsg]);
  };

  // Main input handler for options & text input
  const handleOptionClick = (value: string, label: string) => {
    addUserMessage(label);
    processInput(value, label);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    addUserMessage(text);
    setInputText("");
    processInput(text, text);
  };

  // Core dialogue state machine processor
  const processInput = async (value: string, displayLabel: string) => {
    setIsLoading(true);

    // Simulate natural thinking delay for Bot reactions
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      switch (currentStep) {
        case "REPORT_TYPE": {
          let selectedType = value;
          if (value === "6" || !["1", "2", "3", "4", "5"].includes(value)) {
            selectedType = displayLabel; // Custom type
          }
          setReportType(selectedType);
          
          setCurrentStep("CLIENT_COUNT");
          addBotMessage(
            "오늘/이번 보고서에서 다루실 고객사는 몇 곳인가요? 여러 곳을 한 번에 자유롭게 말씀하셔도 자동 감지됩니다.",
            [
              { value: "1", label: "1. 1개사" },
              { value: "2", label: "2. 2개사" },
              { value: "3", label: "3. 3개사" },
              { value: "4", label: "4. 4개사" },
              { value: "5", label: "5. 5개사 이상 (정확한 곳수를 알려주세요)" },
              { value: "6", label: "6. 여러 곳을 한 번에 자유롭게 서술 (예: A사 김부장, C사 최팀장)" },
              { value: "7", label: "7. 직접 입력" }
            ],
            "CLIENT_COUNT"
          );
          break;
        }

        case "CLIENT_COUNT": {
          // If option 1-4 was selected
          if (["1", "2", "3", "4"].includes(value)) {
            const count = parseInt(value, 10);
            initializeManualClients(count);
          } 
          // Option 5: 5 or more (requires exact count)
          else if (value === "5") {
            addBotMessage("5개사 이상이군요. 정확한 고객사 개수를 숫자로만 알려주세요. (예: 6)");
            setCurrentStep("GET_EXACT_CLIENT_COUNT");
          } 
          // Option 6: Free-form text parse
          else if (value === "6") {
            addBotMessage(
              "다녀오신 모든 고객사와 담당자를 자유롭게 나열해 주세요.\n(예: '삼성전자 박과장, 카카오 김팀장, 그리고 SK텔레콤 최과장 만나고 옴')"
            );
            setCurrentStep("PARSE_FREE_TEXT_CLIENTS");
          } 
          // Option 7 or free-form text input directly
          else {
            // Check if the user wrote a number directly (e.g. "3" or "3곳")
            const numMatch = value.match(/\d+/);
            if (numMatch && !value.includes("사") && !value.includes("부장") && !value.includes("팀장")) {
              const count = parseInt(numMatch[0], 10);
              initializeManualClients(count);
            } else {
              // Try to parse via Gemini since it seems like free text containing company names
              await parseClientsViaGemini(value);
            }
          }
          break;
        }

        case "GET_EXACT_CLIENT_COUNT": {
          const count = parseInt(value.replace(/[^0-9]/g, ""), 10);
          if (isNaN(count) || count <= 0) {
            addBotMessage("숫자가 올바르지 않습니다. 정확한 숫자를 다시 적어주세요.");
          } else {
            initializeManualClients(count);
          }
          break;
        }

        case "PARSE_FREE_TEXT_CLIENTS": {
          await parseClientsViaGemini(value);
          break;
        }

        case "CONFIRM_PARSED_CLIENTS": {
          if (value === "1" || displayLabel.includes("네") || displayLabel.includes("맞습")) {
            // Start interview loop!
            setCurrentStep("CLIENT_INTERVIEW_LOOP");
            setCurrentClientIndex(0);
            startClientInterview(0, clients);
          } else {
            addBotMessage(
              "그렇군요. 다루실 고객사 개수를 직접 알려주시겠어요?",
              [
                { value: "1", label: "1개사" },
                { value: "2", label: "2개사" },
                { value: "3", label: "3개사" },
                { value: "4", label: "4개사" },
                { value: "7", label: "직접 입력" }
              ],
              "CLIENT_COUNT"
            );
            setCurrentStep("CLIENT_COUNT");
            setClients([]);
          }
          break;
        }

        case "CLIENT_INTERVIEW_LOOP": {
          await processClientInterview(value, displayLabel);
          break;
        }

        case "CONFIRMATION": {
          if (value === "1" || displayLabel.includes("제출")) {
            // Step 8: Final Output
            setCurrentStep("FINAL_OUTPUT");
            setIsCompleted(true);
            
            // Print the final markdown table inside the chat as requested
            const finalMd = generateFinalMarkdownTable();
            addBotMessage(finalMd);
          } 
          else if (value === "2" || displayLabel.includes("금액/확률")) {
            // Edit value/probability
            setCorrectionMode("VALUE_PROB");
            promptSelectClientToEdit();
          } 
          else if (value === "3" || displayLabel.includes("상담 내용")) {
            // Edit content
            setCorrectionMode("CONTENT");
            promptSelectClientToEdit();
          } 
          else if (value === "4" || displayLabel.includes("추가")) {
            // Add client
            addNewClientToInterview();
          } 
          else {
            addBotMessage("선택하신 메뉴가 올바르지 않습니다. 번호를 선택해주세요.");
          }
          break;
        }

        case "SELECT_CLIENT_TO_EDIT": {
          const clientIdx = parseInt(value, 10) - 1;
          if (isNaN(clientIdx) || clientIdx < 0 || clientIdx >= clients.length) {
            addBotMessage("올바른 번호를 선택해 주세요.");
          } else {
            setEditingClientIndex(clientIdx);
            if (correctionMode === "VALUE_PROB") {
              addBotMessage(
                `[${clients[clientIdx].name}] 의 새로운 수주 예상 금액 및 확률을 한 줄로 적어주세요.\n(예: '7000만원, 80%' 또는 '금액 미정, 50%')`
              );
              setCurrentStep("EDIT_VALUE_PROB_INPUT");
            } else if (correctionMode === "CONTENT") {
              // Restart Step 3 for this client
              setEditingClientIndex(clientIdx);
              setCurrentStep("CLIENT_INTERVIEW_LOOP");
              setCurrentClientIndex(clientIdx);
              // reset specific values
              const updated = [...clients];
              updated[clientIdx].purpose = "";
              updated[clientIdx].result = "";
              updated[clientIdx].outlier = "";
              updated[clientIdx].jargon = undefined;
              setClients(updated);
              
              startClientInterview(clientIdx, updated);
            }
          }
          break;
        }

        case "EDIT_VALUE_PROB_INPUT": {
          if (editingClientIndex !== null) {
            const { amount, prob } = extractAmountAndProbability(value);
            const updated = [...clients];
            updated[editingClientIndex].dealAmount = amount;
            updated[editingClientIndex].dealProbability = prob;
            updated[editingClientIndex].jargon = undefined; // Need re-refinement
            
            setClients(updated);
            addBotMessage(`[${updated[editingClientIndex].name}] 정보가 업데이트 되었습니다. 실무 워딩 정제를 다시 실행합니다.`);
            
            // Run refinement again
            setCurrentStep("REFINING_JARGON");
            await refineAllReportsWithGemini(updated);
          }
          break;
        }

        default:
          break;
      }
    } catch (err: any) {
      console.error(err);
      addBotMessage("죄송합니다. 처리 중 오류가 발생했습니다. 다시 한번 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize clients for manual inputs
  const initializeManualClients = (count: number) => {
    const initialized: ClientReport[] = Array.from({ length: count }, (_, i) => ({
      id: `client-${Date.now()}-${i}`,
      name: "",
      person: ""
    }));
    setClients(initialized);
    setCurrentClientIndex(0);
    setCurrentStep("CLIENT_INTERVIEW_LOOP");
    setCurrentClientStep("NAME_PERSON");
    addBotMessage(`[1/${count}건] 첫 번째 고객사의 명칭과 담당자명을 입력해 주세요.\n(예: 'SK하이닉스 이과장' 또는 'A사')`);
  };

  // Add a new client in correction mode
  const addNewClientToInterview = () => {
    const newClient: ClientReport = {
      id: `client-${Date.now()}-added`,
      name: "",
      person: ""
    };
    const updated = [...clients, newClient];
    setClients(updated);
    
    const newIndex = updated.length - 1;
    setCurrentClientIndex(newIndex);
    setCurrentStep("CLIENT_INTERVIEW_LOOP");
    setCurrentClientStep("NAME_PERSON");
    addBotMessage(`[${newIndex + 1}/${updated.length}건] 추가하실 고객사의 명칭과 담당자명을 입력해 주세요.\n(예: '현대자동차 최팀장')`);
  };

  // Call API to parse free text client lists
  const parseClientsViaGemini = async (text: string) => {
    addBotMessage("Gemini AI가 입력 내용을 정밀 분석하여 기업명과 인물을 매핑하고 있습니다... 🕵️‍♂️");
    
    try {
      const customKey = localStorage.getItem("custom_gemini_api_key") || "";
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (customKey) {
        headers["x-gemini-api-key"] = customKey;
      }

      const response = await fetch("/api/gemini/parse-clients", {
        method: "POST",
        headers,
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      
      if (data.clients && data.clients.length > 0) {
        const parsedClients: ClientReport[] = data.clients.map((c: any, i: number) => ({
          id: `client-parsed-${Date.now()}-${i}`,
          name: c.name || "미정 고객사",
          person: c.person && c.person !== "미확인" ? c.person : ""
        }));
        
        setClients(parsedClients);
        setCurrentStep("CONFIRM_PARSED_CLIENTS");
        
        // Build confirmation list
        let confirmText = `**${parsedClients.length}개사**로 파악되었습니다:\n`;
        parsedClients.forEach((c, idx) => {
          confirmText += `${idx + 1}) **${c.name}** / ${c.person || "담당자 미확인"}\n`;
        });
        confirmText += "\n내용이 맞으신가요?";
        
        addBotMessage(
          confirmText,
          [
            { value: "1", label: "네, 맞습니다 (인터뷰 시작)" },
            { value: "2", label: "아니요, 다시 적겠습니다" }
          ],
          "CONFIRM_PARSED_CLIENTS"
        );
      } else {
        addBotMessage("고객사를 명확히 구분해내지 못했습니다. 번거로우시겠지만 다루실 고객사 개수를 직접 알려주시겠어요?", [
          { value: "1", label: "1개사" },
          { value: "2", label: "2개사" },
          { value: "3", label: "3개사" },
          { value: "4", label: "4개사" },
          { value: "7", label: "직접 입력" }
        ]);
        setCurrentStep("CLIENT_COUNT");
      }
    } catch (e) {
      console.error(e);
      addBotMessage("서버와의 분석 연동에 실패해 수동 지정으로 전환합니다. 고객사 개수를 선택해 주세요.", [
        { value: "1", label: "1개사" },
        { value: "2", label: "2개사" },
        { value: "3", label: "3개사" }
      ]);
      setCurrentStep("CLIENT_COUNT");
    }
  };

  // Launch interview questions for index N
  const startClientInterview = (index: number, clientList: ClientReport[]) => {
    const client = clientList[index];
    const clientPrefix = `[${index + 1}/${clientList.length}건] **${client.name}**(${client.person || "담당자 미정"})`;

    if (reportType === "5") {
      // Emergency claim severity track first
      setCurrentClientStep("SEVERITY");
      addBotMessage(
        `${clientPrefix} 클레임/리스크의 심각도는 어느 정도인가요?`,
        [
          { value: "1", label: "1. 경미 (고객 문의 수준, 자체 해결 가능)" },
          { value: "2", label: "2. 보통 (고객 불만 표출, 유선/대면 대응 필요)" },
          { value: "3", label: "3. 심각 (계약 해지·이탈 위험 언급됨)" },
          { value: "4", label: "4. 매우 심각 (법적 조치 언급 또는 임원급 대응 필요)" },
          { value: "5", label: "5. 직접 입력 (자유롭게 입력)" }
        ],
        "CLAIM_SEVERITY"
      );
    } else {
      // Standard purpose track
      setCurrentClientStep("PURPOSE");
      addBotMessage(
        `${clientPrefix} 이번 영업 활동의 주된 목적은 무엇이었나요?`,
        [
          { value: "1", label: "1. 신규 제품/서비스 도입 제안 및 시연(PT)" },
          { value: "2", label: "2. 기존 계약 연장 및 업셀링(Up-selling) 논의" },
          { value: "3", label: "3. 견적서 제출 및 단가/조건 협상" },
          { value: "4", label: "4. 정기 방문을 통한 릴레이션십 강화" },
          { value: "5", label: "5. 납품 지연/품질 불량 등 이슈 대응 및 CS" },
          { value: "6", label: "6. 직접 입력 (상세 방문 목적을 자유롭게 입력)" }
        ],
        "SALES_PURPOSE"
      );
    }
  };

  // Process sub-steps for client interview loops
  const processClientInterview = async (value: string, displayLabel: string) => {
    const updated = [...clients];
    const client = updated[currentClientIndex];
    const clientPrefix = `[${currentClientIndex + 1}/${clients.length}건] **${client.name}**`;

    switch (currentClientStep) {
      case "NAME_PERSON": {
        // Parse "A사 김부장" style manually
        const parts = value.split(/\s+/);
        client.name = parts[0] || "고객사명";
        client.person = parts.slice(1).join(" ") || "담당자 미확인";
        setClients(updated);

        // Advance
        startClientInterview(currentClientIndex, updated);
        break;
      }

      case "SEVERITY": {
        let severity = "";
        if (value === "1") severity = "경미";
        else if (value === "2") severity = "보통";
        else if (value === "3") severity = "심각";
        else if (value === "4") severity = "매우 심각";
        else severity = displayLabel;

        client.claimSeverity = severity;
        setClients(updated);

        // Claim track - Proceed to Step 3 Claim Cause
        setCurrentClientStep("PURPOSE");
        addBotMessage(
          `${clientPrefix} 클레임/리스크의 구체적인 원인 및 개요는 무엇인가요?`,
          [
            { value: "1", label: "1. 납품 지연 및 납기 일정 미준수" },
            { value: "2", label: "2. 제품 기능 불량 및 품질 불만족" },
            { value: "3", label: "3. 단가/단가 인상 갈등 및 가격 경쟁력 저하" },
            { value: "4", label: "4. 고객사 시스템 장애 및 기술 지원 불만족" },
            { value: "5", label: "5. 서비스 대응 부재 및 소통 오류" },
            { value: "6", label: "6. 직접 입력 (상세 원인 상황을 자유롭게 입력)" }
          ],
          "CLAIM_CAUSE"
        );
        break;
      }

      case "PURPOSE": {
        let purpose = "";
        if (reportType === "5") {
          // Claim causes
          const claimCausesMap: { [key: string]: string } = {
            "1": "납품 지연 및 납기 일정 미준수",
            "2": "제품 기능 불량 및 품질 불만족",
            "3": "단가 인상 갈등 및 가격 경쟁력 저하",
            "4": "고객사 시스템 장애 및 기술 지원 불만족",
            "5": "서비스 대응 부재 및 소통 오류"
          };
          purpose = claimCausesMap[value] || displayLabel;
        } else {
          // Standard purposes
          const standardPurposeMap: { [key: string]: string } = {
            "1": "신규 제품/서비스 도입 제안 및 시연(PT)",
            "2": "기존 계약 연장 및 업셀링(Up-selling) 논의",
            "3": "견적서 제출 및 단가/조건 협상",
            "4": "정기 방문을 통한 릴레이션십 강화",
            "5": "납품 지연/품질 불량 등 이슈 대응 및 CS"
          };
          purpose = standardPurposeMap[value] || displayLabel;
        }

        client.purpose = purpose;
        setClients(updated);

        // Move to Step 4: Result
        setCurrentClientStep("RESULT");
        if (reportType === "5") {
          addBotMessage(
            `${clientPrefix} 고객 반응 및 긴급 대응/에스컬레이션 상황을 선택해 주세요.`,
            [
              { value: "1", label: "1. 1차 조치 완료 및 긴급 재발방지대책 수립 중" },
              { value: "2", label: "2. 내부 부서(제조/개발 등) 에스컬레이션 및 합동 점검 예정" },
              { value: "3", label: "3. 경영진 보고 완료 및 긴급 대면 보상 협의 예정" },
              { value: "4", label: "4. 고객 불만 1차 진화 완료 및 신뢰 회복 방안 제시 예정" },
              { value: "5", label: "5. 직접 입력 (고객 반응 및 상황 자유 입력)" }
            ],
            "CLAIM_RESULT"
          );
        } else {
          addBotMessage(
            `${clientPrefix} 미팅의 구체적인 결과와 수주 예상액/확률을 알려주세요.\n확률은 숫자(%)로 답해주시면 ERP에 정확히 자동 반영됩니다.`,
            [
              { value: "1", label: "1. 제안 내용 긍정적 검토 확인 (수주 확률 70% 이상)" },
              { value: "2", label: "2. 단가 인하 요청으로 인한 재협상 진행 중 (확률 40~70%)" },
              { value: "3", label: "3. 최종 계약 체결 확정 (확률 100%, 금액 확정)" },
              { value: "4", label: "4. 예산 부족/스펙 미달로 인한 도입 보류(Drop) (확률 10% 이하)" },
              { value: "5", label: "5. 클레임 원인 파악 및 1차 대응 완료" },
              { value: "6", label: "6. 직접 입력 (구체적인 고객 반응, 예상금액, 수주 확률 %로 적어주세요)" }
            ],
            "SALES_RESULT"
          );
        }
        break;
      }

      case "RESULT": {
        let result = "";
        let impliedProbability = "";
        let impliedAmount = "";

        if (reportType === "5") {
          const claimResultMap: { [key: string]: string } = {
            "1": "1차 조치 완료 및 긴급 재발방지대책 수립 중",
            "2": "내부 부서(제조/개발 등) 에스컬레이션 및 합동 점검 예정",
            "3": "경영진 보고 완료 및 긴급 대면 보상 협의 예정",
            "4": "고객 불만 1차 진화 완료 및 신뢰 회복 방안 제시 예정"
          };
          result = claimResultMap[value] || displayLabel;
        } else {
          const standardResultMap: { [key: string]: string } = {
            "1": "제안 내용 긍정적 검토 확인",
            "2": "단가 인하 요청으로 인한 재협상 진행 중",
            "3": "최종 계약 체결 확정",
            "4": "예산 부족/스펙 미달로 인한 도입 보류(Drop)",
            "5": "클레임 원인 파악 및 1차 대응 완료"
          };
          result = standardResultMap[value] || displayLabel;

          // Implied statistics based on standard option choices
          if (value === "1") impliedProbability = "70% 이상";
          else if (value === "2") impliedProbability = "40~70%";
          else if (value === "3") impliedProbability = "100%";
          else if (value === "4") impliedProbability = "10% 이하";
          else if (value === "5") impliedProbability = "미확인";
        }

        client.result = result;
        
        // Extract numbers if user wrote manual response containing amount/probability
        const parsedNums = extractAmountAndProbability(value === "6" ? displayLabel : value);
        client.dealAmount = parsedNums.amount || impliedAmount || client.dealAmount || "";
        client.dealProbability = parsedNums.prob || impliedProbability || client.dealProbability || "";
        
        setClients(updated);

        // Check Constraint 4: If standard track and values are completely missing, do a 1-time reconfirmation
        if (reportType !== "5" && !client.dealAmount && !client.dealProbability && reconfirmAttempts < 1) {
          setReconfirmAttempts(1);
          setCurrentClientStep("RECONFIRM_VALUE");
          addBotMessage(
            "잠시만요! 영업 기회 적재를 위해 예상 수주 금액이나 성공 확률(%)을 입력해 주시겠어요?\n(예: '3000만원, 80%' / 정보가 없다면 '없음' 입력)"
          );
        } else {
          // Proceed to Step 5: Outlier
          setReconfirmAttempts(0);
          setCurrentClientStep("OUTLIER");
          addBotMessage(
            `${clientPrefix} 특이사항(경쟁사 동향 등)이나 향후 넥스트 Action Plan을 알려주세요.`,
            [
              { value: "1", label: "1. 타사(경쟁사) 진입 정황 포착 및 대응책 마련 필요" },
              { value: "2", label: "2. 고객사 내부 의사결정자(Key-man) 변동 사항 있음" },
              { value: "3", label: "3. 금주 내 수정 견적서 및 추가 제안서 발송 예정" },
              { value: "4", label: "4. 차주 중 임원진 동반 재방문 및 대면 보고 예정" },
              { value: "5", label: "5. 특이사항 없음 (정상 진행)" },
              { value: "6", label: "6. 직접 입력 (특이동향이나 다음 미팅일정 등 자유 기재)" }
            ],
            "OUTLIER"
          );
        }
        break;
      }

      case "RECONFIRM_VALUE": {
        setReconfirmAttempts(0); // Reset
        const parsed = extractAmountAndProbability(value);
        client.dealAmount = parsed.amount || "미확인";
        client.dealProbability = parsed.prob || "미확인";
        setClients(updated);

        // Proceed to Step 5: Outlier
        setCurrentClientStep("OUTLIER");
        addBotMessage(
          `${clientPrefix} 특이사항(경쟁사 동향 등)이나 향후 넥스트 Action Plan을 알려주세요.`,
          [
            { value: "1", label: "1. 타사(경쟁사) 진입 정황 포착 및 대응책 마련 필요" },
            { value: "2", label: "2. 고객사 내부 의사결정자(Key-man) 변동 사항 있음" },
            { value: "3", label: "3. 금주 내 수정 견적서 및 추가 제안서 발송 예정" },
            { value: "4", label: "4. 차주 중 임원진 동반 재방문 및 대면 보고 예정" },
            { value: "5", label: "5. 특이사항 없음 (정상 진행)" },
            { value: "6", label: "6. 직접 입력 (특이동향이나 다음 미팅일정 등 자유 기재)" }
          ],
          "OUTLIER"
        );
        break;
      }

      case "OUTLIER": {
        const outlierMap: { [key: string]: string } = {
          "1": "타사(경쟁사) 진입 정황 포착 및 대응책 마련 필요",
          "2": "고객사 내부 의사결정자(Key-man) 변동 사항 있음",
          "3": "금주 내 수정 견적서 및 추가 제안서 발송 예정",
          "4": "차주 중 임원진 동반 재방문 및 대면 보고 예정",
          "5": "특이사항 없음 (정상 진행)"
        };
        client.outlier = outlierMap[value] || displayLabel;
        client.isCompleted = true;
        setClients(updated);

        // Move to next client, or finish interview loop!
        if (currentClientIndex < clients.length - 1) {
          const nextIndex = currentClientIndex + 1;
          setCurrentClientIndex(nextIndex);
          setCurrentClientStep("NAME_PERSON");
          const nextClient = updated[nextIndex];
          if (!nextClient.name) {
            addBotMessage(`[${nextIndex + 1}/${clients.length}건] 다음 고객사의 명칭과 담당자명을 입력해 주세요 (예: '네이버 최팀장').`);
          } else {
            startClientInterview(nextIndex, updated);
          }
        } else {
          // All clients completed! Go to Step 6: Internal corporate jargon refinement
          setCurrentStep("REFINING_JARGON");
          addBotMessage("✨ 모든 고객사의 현장 데이터 수집이 끝났습니다. 이제 파편적인 표현들을 고도로 정제된 비즈니스 실무 워딩(Corporate Jargon)으로 변환하고 마크다운 문서를 빌드합니다. 잠시만 기다려주세요...");
          await refineAllReportsWithGemini(updated);
        }
        break;
      }

      default:
        break;
    }
  };

  // Helper to extract Amount and Probability using regular expression
  const extractAmountAndProbability = (text: string) => {
    let amount = "";
    let prob = "";

    // Probability extraction
    const percentMatch = text.match(/\d+%/g) || text.match(/\d+\s*%/g) || text.match(/\d+~\d+%/g);
    if (percentMatch) {
      prob = percentMatch[0];
    }

    // Amount extraction (e.g. 1억, 5000만원, 10,000,000원, $1000)
    const amountMatch = text.match(/\d+\s*(억|만|만원|원)/) || text.match(/[\d,]+\s*(원|만원|usd)/gi) || text.match(/\d+억\s*\d*천*만*원*/);
    if (amountMatch) {
      amount = amountMatch[0];
    }

    return { amount, prob };
  };

  // Step 6: Refinement with server-side Gemini API
  const refineAllReportsWithGemini = async (clientList: ClientReport[]) => {
    const updated = [...clientList];
    
    try {
      const customKey = localStorage.getItem("custom_gemini_api_key") || "";
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (customKey) {
        headers["x-gemini-api-key"] = customKey;
      }

      for (let i = 0; i < updated.length; i++) {
        const c = updated[i];
        
        const response = await fetch("/api/gemini/refine-report", {
          method: "POST",
          headers,
          body: JSON.stringify({
            reportType,
            clientName: c.name,
            clientPerson: c.person,
            purpose: c.purpose || "미수립",
            result: c.result || "미결정",
            dealAmount: c.dealAmount || "미확인",
            dealProbability: c.dealProbability || "미확인",
            outlier: c.outlier || "특이동향 없음"
          })
        });

        const refined: RefinedJargon = await response.json();
        c.jargon = refined;
      }

      setClients(updated);

      // Transition to Step 7: Final Confirmation
      setCurrentStep("CONFIRMATION");
      addBotMessage(
        "📝 실무 워딩 정제가 완료되었습니다! 아래 옵션 중 하나를 선택해 주세요.",
        [
          { value: "1", label: "1. 네, 이대로 최종 제출합니다" },
          { value: "2", label: "2. 아니요, 특정 건의 금액/확률을 수정하겠습니다" },
          { value: "3", label: "3. 아니요, 특정 건의 상담 내용을 다시 작성하겠습니다" },
          { value: "4", label: "4. 새로운 고객사(건)를 추가하겠습니다" }
        ],
        "CONFIRMATION"
      );
    } catch (e) {
      console.error("Refinement error:", e);
      addBotMessage("B2B 정제 엔진 연동에 실패했습니다. 수집된 기본 정보로 진행합니다.", [
        { value: "1", label: "이대로 제출" },
        { value: "2", label: "수동 수정" }
      ]);
      setCurrentStep("CONFIRMATION");
    }
  };

  // Prompt client selector for editing
  const promptSelectClientToEdit = () => {
    setCurrentStep("SELECT_CLIENT_TO_EDIT");
    const options = clients.map((c, idx) => ({
      value: String(idx + 1),
      label: `${idx + 1}. ${c.name} (${c.person || "담당자 미확인"})`
    }));
    addBotMessage("수정하고자 하는 고객사 번호를 선택해 주세요.", options, "SELECT_CLIENT_TO_EDIT");
  };

  // Helper to construct finalized Markdown output table exactly like requested
  const generateFinalMarkdownTable = () => {
    const getReportTypeName = (type: string) => {
      switch (type) {
        case "1": return "일일 영업보고서 (신규 고객사 중심)";
        case "2": return "일일 영업보고서 (기존 고객사 중심)";
        case "3": return "주간 실적 및 파이프라인 보고서";
        case "4": return "월간 어카운트 리뷰";
        case "5": return "고객사 클레임/리스크 긴급 보고";
        default: return type;
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
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lyyyy = lastWeek.getFullYear();
        const lmm = String(lastWeek.getMonth() + 1).padStart(2, "0");
        const ldd = String(lastWeek.getDate()).padStart(2, "0");
        return `${lyyyy}-${lmm}-${ldd} ~ ${yyyy}-${mm}-${dd}`;
      } else if (reportType === "4") {
        return `${yyyy}년 ${today.getMonth() + 1}월`;
      } else {
        return `${yyyy}-${mm}-${dd}`;
      }
    };

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

    // High level alert
    let riskSummary = "특이사항 없음 (정상 범위 내 관리 중)";
    const claimClients = clients.filter(c => c.claimSeverity && c.claimSeverity !== "경미");
    if (claimClients.length > 0) {
      const highest = claimClients.reduce((prev, current) => {
        const severityMap: { [key: string]: number } = { "매우 심각": 4, "심각": 3, "보통": 2, "경미": 1 };
        const prevVal = severityMap[prev.claimSeverity || ""] || 0;
        const curVal = severityMap[current.claimSeverity || ""] || 0;
        return curVal > prevVal ? current : prev;
      });
      riskSummary = `[${highest.name}] 심각도 '${highest.claimSeverity}' 클레임 대응. 원인: ${highest.purpose || "품질이슈"}. F/U 조치 진행 중.`;
    } else {
      const riskWithCompetitors = clients.find(c => c.outlier && c.outlier.includes("경쟁사"));
      if (riskWithCompetitors) {
        riskSummary = `[${riskWithCompetitors.name}] 타사 진입 정황 포착에 따른 시장 점유 위협 발생. 차별화 제안 수립 요구.`;
      }
    }

    const firstAction = clients.map(c => c.jargon?.action || "후속 F/U 수립").filter(Boolean)[0] || "후속 F/U 수립";

    md += `| 종합 현황 | 내용 |\n`;
    md += `|---|---|\n`;
    md += `| 최우선 리스크/에스컬레이션 | ${riskSummary} |\n`;
    md += `| 금주/익일 우선순위 | ${firstAction} |\n`;

    return md;
  };

  // Reset reporting flow
  const handleResetFlow = () => {
    setReportType("1");
    setClients([]);
    setCurrentClientIndex(0);
    setCurrentStep("REPORT_TYPE");
    setCurrentClientStep("NAME_PERSON");
    setEditingClientIndex(null);
    setCorrectionMode("NONE");
    setIsCompleted(false);
    
    // Reset initial messages
    setMessages([
      {
        id: "welcome-1",
        sender: "bot",
        text: "안녕하세요! B2B 실전 영업 및 CRM 데이터 고도화를 위한 '대화형 현업 영업보고서 생성 봇'입니다. 다시 새로운 보고서를 작성해 볼까요?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      },
      {
        id: "step1-q",
        sender: "bot",
        text: "작성하실 영업보고서의 유형을 알려주세요.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        options: [
          { value: "1", label: "1. 일일 영업보고서 (신규 고객사 중심)" },
          { value: "2", label: "2. 일일 영업보고서 (기존 고객사 중심)" },
          { value: "3", label: "3. 주간 실적 및 파이프라인 보고서" },
          { value: "4", label: "4. 월간 어카운트 리뷰" },
          { value: "5", label: "5. 고객사 클레임/리스크 긴급 보고" },
          { value: "6", label: "6. 직접 입력 (원하시는 보고서 유형을 적어주세요)" }
        ],
        stepId: "REPORT_TYPE"
      }
    ]);
  };

  if (showLanding) {
    return <LandingPage onStart={() => setShowLanding(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col selection:bg-blue-100 selection:text-blue-900 antialiased">
      
      {/* Visual Header */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-50 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-sm italic tracking-tight shadow-md shadow-indigo-100 shrink-0">
              SB
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 text-[9px] bg-indigo-50 text-indigo-600 font-sans font-bold rounded-md border border-indigo-100 uppercase tracking-wider">B2B CRM HYBRID</span>
                <span className="px-2 py-0.5 text-[9px] bg-slate-100 text-slate-600 font-sans font-bold rounded-md border border-slate-200">v2.5-Flash</span>
              </div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1 leading-none">
                대화형 현업 영업보고서 생성 봇
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3.5 flex-wrap">
            <button
              onClick={() => setShowLanding(true)}
              className="px-3.5 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/60 rounded-xl border border-indigo-100 transition duration-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Info className="w-4 h-4 text-indigo-500" />
              서비스 특장점/안내 홈
            </button>
            <div className="flex items-center gap-2.5 bg-slate-100/80 p-2 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium px-4">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
              <span>CLOUD ERP CONNECTED: ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        
        {/* Left Side: Conversational Chat UI */}
        <section className="lg:col-span-5 flex flex-col h-[calc(100vh-140px)] min-h-[500px] bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          
          {/* Chat Panel Header */}
          <div className="bg-white px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-bold text-slate-800">AI 영업 리포터 대화창</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              숫자 번호 입력 가능
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/40">
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const isBot = m.sender === "bot";
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-3 max-w-[90%] ${isBot ? "" : "ml-auto flex-row-reverse"}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-xs font-bold shadow-xs ${
                      isBot 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-100" 
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}>
                      {isBot ? "AI" : <User className="w-4 h-4" />}
                    </div>

                    {/* Bubble Content */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                        isBot 
                          ? "bg-white text-slate-800 rounded-tl-xs border border-slate-200/70" 
                          : "bg-indigo-600 text-white font-medium rounded-tr-xs"
                      }`}>
                        <div className="whitespace-pre-wrap select-text">{m.text}</div>
                      </div>

                      {/* Display Action Buttons / Options directly under the bot message */}
                      {isBot && m.options && m.options.length > 0 && currentStep === m.stepId && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="grid grid-cols-1 gap-1.5 mt-2.5"
                        >
                          {m.options.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => handleOptionClick(opt.value, opt.label)}
                              className={`w-full text-left p-3.5 rounded-xl text-[12px] font-semibold transition-all duration-200 shadow-xs flex items-center justify-between cursor-pointer group border ${
                                opt.value === "5" 
                                  ? "border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100/75" 
                                  : opt.value === "1"
                                  ? "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/75"
                                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300"
                              }`}
                            >
                              <span className="truncate pr-4">{opt.label}</span>
                              <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                                opt.value === "5"
                                  ? "text-rose-400 group-hover:text-rose-700"
                                  : "text-slate-400 group-hover:text-indigo-600"
                              }`} />
                            </button>
                          ))}
                        </motion.div>
                      )}

                      {/* Time timestamp */}
                      <p className={`text-[9px] text-slate-400 font-medium ${!isBot ? "text-right" : ""}`}>
                        {m.timestamp}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Simulated Bot Typing State */}
            {isLoading && (
              <div className="flex gap-3 max-w-[90%]">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-xs font-bold animate-pulse">
                  AI
                </div>
                <div className="bg-white border border-slate-200/70 p-4 rounded-2xl rounded-tl-xs flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Keyboard input bar */}
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 shrink-0">
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  currentStep === "CLIENT_INTERVIEW_LOOP" && currentClientStep === "NAME_PERSON"
                    ? "예: 네이버 홍길동부장 (회사명 담당자명 입력)"
                    : "답변할 내용을 직접 입력하거나 번호를 기재해주세요..."
                }
                disabled={isLoading}
                className="flex-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition disabled:opacity-50 font-medium"
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white p-3.5 rounded-xl font-bold transition flex items-center justify-center cursor-pointer shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Helper Tips */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-3 px-1">
              <span>Enter 키로 전송 가능</span>
              <span className="text-indigo-600 flex items-center gap-1 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Gemini AI 실무 용어 엔진 동작 중
              </span>
            </div>
          </div>
        </section>

        {/* Right Side: CRM Live Preview Dashboard */}
        <section className="lg:col-span-7 h-[calc(100vh-140px)] min-h-[500px]">
          <ReportDashboard 
            reportType={reportType}
            clients={clients}
            isCompleted={isCompleted}
            onReset={handleResetFlow}
          />
        </section>

      </main>
    </div>
  );
}
