'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Users, Clock, AlertTriangle, Send, CheckCircle2, 
  Shield, BarChart3, Edit3, Lock, Unlock, LogOut, Eye, Download, 
  CheckCircle, Trash2, LockKeyhole, ChevronDown 
} from 'lucide-react';
import { supabase } from './lib/supabase';

const STAFF_LIST = [
  'Tong Yiu Bun',
  'Ng Wai Hung Samuel',
  'Chan Kai Ming',
  'Lai Tsing Yin',
  'Huang Xiuyi Apple',
  'Lau Man Ting',
  'Fung Hing Pui Christy',
  'Chu Ka Chun John',
  'Ye Shuyi Candy',
  'Lam Ngan Sze Jessie',
  'Au Yeung Sze Man Carman',
  'Cheung Ming Ying',
  'To Kai Kei',
  'Cheung Ming Lai Lily',
  'Lai Hiu Tung',
  'Fung Oi Lin PoPo',
  'Lau Man Wa',
  'Lam Yan Tung Jasmine',
  'Lam Yan Ling Emma',
  'Zhang Shenjun',
  'Leung Ka Ki',
  'Lo Hiu Yu',
  'Wong Hei Laam, Hazel'
];

const DUTY_PATTERNS = [
  { id: '0800-1648', label: '0800-1648 (A)', mins: 528, hours: 8.8, desc: '平日>=6人, 假期/週末3人' },
  { id: '1000-1848', label: '1000-1848 (10點)', mins: 528, hours: 8.8, desc: '每日限 1 人' },
  { id: '1330-2218', label: '1330-2218 (P)', mins: 528, hours: 8.8, desc: '平日2人, 假期/週末1人' },
  { id: 'AN', label: 'AN (ANight)', mins: 966, hours: 16.1, desc: '每日限 1 人' },
  { id: 'N', label: 'N (夜更)', mins: 528, hours: 8.8, desc: '夜更' },
   { id: 'AL', label: 'AL (年假)', mins: 528, hours: 8.8, desc: '年假' },
  { id: 'CL', label: 'CL (恩恤假)', mins: 528, hours: 8.8, desc: '恩恤假' },
  { id: 'ML', label: 'ML (產假)', mins: 528, hours: 8.8, desc: '產假' },
  { id: '育嬰假', label: '育嬰假', mins: 528, hours: 8.8, desc: '育嬰假' },
  { id: 'DO', label: 'DO (Day Off)', mins: 0, hours: 0, desc: 'Day Off (每月剛好4日)' },
  { id: 'O', label: 'O (休假)', mins: 0, hours: 0, desc: '休假 (每月剛好4日)' },
];

export default function OtaDutyApp() {
  const [activeTab, setActiveTab] = useState<'board1' | 'preview' | 'board2' | 'board3'>('board1');
  // 記錄連假選取的起點日期
const [rangeStartDate, setRangeStartDate] = useState<string | null>(null);
const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 1. 全自動計算預設目標月份 (改為 State + useEffect，避免 Next.js SSR / Prerender 報錯)
  const [defaultConfig, setDefaultConfig] = useState({
    targetYear: 2026,
    targetMonthNum: 11,
    isLocked: false,
    monthStr: '2026-11'
  });

  const [viewMonthStr, setViewMonthStr] = useState('2026-11');

  useEffect(() => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  const currentDate = today.getDate();

  const targetDateObj = new Date(currentYear, currentMonth + 1, 1);
  const targetYear = targetDateObj.getFullYear();
  const targetMonthNum = targetDateObj.getMonth() + 1;

  const isLocked = currentDate > 22;
  const monthStr = `${targetYear}-${targetMonthNum < 10 ? '0' + targetMonthNum : targetMonthNum}`;

  setDefaultConfig({ targetYear, targetMonthNum, isLocked, monthStr });
  setViewMonthStr(monthStr);
  setSelectedDate(`${monthStr}-01`);

  // 生成歷史 12 個月選單 (100% 安全，避開 Vercel Build Prerender 錯誤)
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const str = `${y}-${m < 10 ? '0' + m : m}`;
    options.push({ label: `${y} 年 ${m} 月`, value: str });
  }
  setHistoryMonthOptions(options);
}, []);

  // 動態計算當前選定檢視月份的詳細天數資訊
  const activeMonthConfig = useMemo(() => {
    const [y, m] = viewMonthStr.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return { year: y, monthNum: m, daysInMonth, daysArray, monthStr: viewMonthStr };
  }, [viewMonthStr]);

 const [historyMonthOptions, setHistoryMonthOptions] = useState<{ label: string; value: string }[]>([]);

  // 預設 state
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDate, setSelectedDate] = useState(`${defaultConfig.monthStr}-01`);
  const [selectedPattern, setSelectedPattern] = useState(DUTY_PATTERNS[0].id);
  
  const [requests, setRequests] = useState<{
    duty_pattern: string; staff_name: string; request_date: string; pattern: string 
}[]>([]);
  const [matrixShifts, setMatrixShifts] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
   const selectedDateStats = useMemo(() => {
    if (!selectedDate || !requests) return null;
    
    const dayRequests = requests.filter((r) => r.request_date === selectedDate);
    if (dayRequests.length === 0) return { total: 0, patterns: {} };

    const patternsCount = dayRequests.reduce((acc, curr) => {
      const code = curr.pattern || '其他';
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: dayRequests.length,
      patterns: patternsCount,
    };
  }, [selectedDate, requests]);
  // 判斷選定日期是否為週末或公眾假期
  const holidayInfo = useMemo(() => {
    if (!selectedDate) return null;

    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay(); // 0 = 週日, 6 = 週六

    // 2026 年常見香港公眾假期
    const publicHolidays: Record<string, string> = {
      '2026-01-01': '元旦',
      '2026-02-17': '農曆年初一',
      '2026-02-18': '農曆年初二',
      '2026-02-19': '農曆年初三',
      '2026-04-03': '耶穌受難節',
      '2026-04-04': '清明節 / 耶穌受難節翌日',
      '2026-04-06': '復活節星期一',
      '2026-05-01': '勞動節',
      '2026-05-25': '佛誕',
      '2026-06-19': '端午節',
      '2026-07-01': '香港特別行政區成立紀念日',
      '2026-09-26': '中秋節翌日',
      '2026-10-01': '國慶日',
      '2026-10-19': '重陽節',
      '2026-12-25': '聖誕節',
      '2026-12-26': '聖誕節後第一個周日',
    };

    const isPublicHoliday = publicHolidays[selectedDate];

    if (isPublicHoliday) {
      return { type: 'PH', label: `🎉 公眾假期（${isPublicHoliday}）` };
    }
    if (dayOfWeek === 6) {
      return { type: 'WEEKEND', label: '📅 星期六（Weekend）' };
    }
    if (dayOfWeek === 0) {
      return { type: 'WEEKEND', label: '📅 星期日（Weekend）' };
    }

    return null;
  }, [selectedDate]);
  // 當切換檢視月份時，重新讀取該月份的數據
  useEffect(() => {
    fetchData();
  }, [viewMonthStr]);
// 每 5 秒自動抓取最新資料，確保即時同步
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [viewMonthStr]);
  // 載入 localStorage 名稱
  useEffect(() => {
    const savedStaff = localStorage.getItem('ota_duty_user_name');
    if (savedStaff && STAFF_LIST.includes(savedStaff)) {
      setSelectedStaff(savedStaff);
    }
  }, []);
// 處理日期點擊（支援買機票式的連假選取）
  const handleDateClick = (clickedDateStr: string) => {
    // 檢查當前選取的 Pattern 限額
    let maxDays = 1;
    if (selectedPattern === 'AL') maxDays = 5;
    else if (selectedPattern === 'CL' || selectedPattern === '育嬰假') maxDays = 3;
    else if (selectedPattern === 'ML') maxDays = 31; // 不限日數

    // 如果選擇普通更次，或者尚未點選開始日期
    if (maxDays === 1 || !rangeStartDate) {
      setRangeStartDate(clickedDateStr);
      setSelectedDate(clickedDateStr);
      setSelectedDates([clickedDateStr]);
      return;
    }

    // 點選第二個日期（計算連續日期範圍）
    const start = new Date(rangeStartDate);
    const end = new Date(clickedDateStr);

    // 如果後點的日期比起點早，重新設為起點
    if (end < start) {
      setRangeStartDate(clickedDateStr);
      setSelectedDate(clickedDateStr);
      setSelectedDates([clickedDateStr]);
      return;
    }

    // 計算日數差
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > maxDays) {
      alert(`【${selectedPattern}】最多只能連續選擇 ${maxDays} 天！`);
      return;
    }

    // 生成連續日期陣列
    const rangeArray: string[] = [];
    let curr = new Date(start);
    while (curr <= end) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      rangeArray.push(`${year}-${month}-${day}`);
      curr.setDate(curr.getDate() + 1);
    }

    setSelectedDates(rangeArray); // 批量選取連假
    setRangeStartDate(null); // 重設起點狀態
  };
  const fetchData = async () => {
    const { data: reqData } = await supabase
      .from('staff_requests')
      .select('*')
      .gte('request_date', `${activeMonthConfig.monthStr}-01`)
      .lte('request_date', `${activeMonthConfig.monthStr}-${activeMonthConfig.daysInMonth}`)
      .order('created_at', { ascending: false });
    if (reqData) setRequests(reqData);

    const { data: dutyData } = await supabase
      .from('duty_schedules')
      .select('*')
      .gte('duty_date', `${activeMonthConfig.monthStr}-01`)
      .lte('duty_date', `${activeMonthConfig.monthStr}-${activeMonthConfig.daysInMonth}`);

    if (dutyData) {
      const map: Record<string, string> = {};
      dutyData.forEach((row: any) => {
        map[`${row.staff_name}-${row.duty_date}`] = row.pattern;
      });
      setMatrixShifts(map);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setWarningMsg('');

    if (defaultConfig.isLocked && !isAdmin) {
      setWarningMsg('🔒 本月報更已於 22 號 23:59 截止，無法再提交！');
      return;
    }

    if (!selectedStaff) {
      if (selectedDates.length === 0) {
    setWarningMsg('⚠️ 請先選擇日期！');
    return;
  }
      setWarningMsg('⚠️ 請先選擇您的姓名，再提交申請！');
      return;
    }

    localStorage.setItem('ota_duty_user_name', selectedStaff);

    const userReqCount = requests.filter(r => r.staff_name === selectedStaff).length + 1;
    if (userReqCount > 4) {
      setWarningMsg(`⚠️ 提醒：${selectedStaff} 本月更期申請已達 ${userReqCount} 次！`);
    }

    // 將選取的所有連假日期一次過批量寫入 Supabase
  const payload = selectedDates.map((d) => ({
    staff_name: selectedStaff,
    request_date: d,
    pattern: selectedPattern,
    created_at: new Date().toISOString(),
  }));

  const { error: reqError } = await supabase
    .from('staff_requests')
    .upsert(payload, { onConflict: 'staff_name,request_date' });

    if (reqError) {
      alert('儲存失敗: ' + reqError.message);
      return;
    }

    await supabase.from('duty_schedules').upsert([
      { staff_name: selectedStaff, duty_date: selectedDate, pattern: selectedPattern }
    ], { onConflict: 'staff_name,duty_date' });

    setSuccessMsg(`✅ 成功提交 ${selectedDate} 的 [${selectedPattern}] 更期申請！`);
    fetchData();
  };

  const handleMatrixChange = async (staff: string, day: number, newPattern: string) => {
    const dateStr = `${activeMonthConfig.monthStr}-${day < 10 ? '0' + day : day}`;
    setMatrixShifts(prev => ({ ...prev, [`${staff}-${dateStr}`]: newPattern }));

    await supabase.from('duty_schedules').upsert([
      { staff_name: staff, duty_date: dateStr, pattern: newPattern }
    ], { onConflict: 'staff_name,duty_date' });
  };

  const calculateTotalMinutes = (staff: string) => {
    let totalMins = 0;
    activeMonthConfig.daysArray.forEach(day => {
      const dateStr = `${activeMonthConfig.monthStr}-${day < 10 ? '0' + day : day}`;
      const patternId = matrixShifts[`${staff}-${dateStr}`] || 'O';
      const patternObj = DUTY_PATTERNS.find(p => p.id === patternId);
      if (patternObj) totalMins += patternObj.mins;
    });
    return totalMins;
  };

  const checkOffRules = (staff: string) => {
    let totalDO = 0;
    activeMonthConfig.daysArray.forEach(day => {
      const dateStr = `${activeMonthConfig.monthStr}-${day < 10 ? '0' + day : day}`;
      if (matrixShifts[`${staff}-${dateStr}`] === 'DO') totalDO++;
    });
    const isDoValid = totalDO === 4;
    return { totalDO, isDoValid, hasError: !isDoValid };
  };

  const getDayPatternCount = (dateStr: string, patternId: string) => {
    let count = 0;
    STAFF_LIST.forEach(staff => {
      if (matrixShifts[`${staff}-${dateStr}`] === patternId) count++;
    });
    return count;
  };

  const isRequestedByStaff = (staff: string, dateStr: string, pattern: string) => {
    return requests.some(r => r.staff_name === staff && r.request_date === dateStr && r.pattern === pattern);
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    let header = ["員工姓名", ...activeMonthConfig.daysArray.map(d => `${activeMonthConfig.monthNum}/${d}`), "全月總時數"];
    csvContent += header.join(",") + "\r\n";

    STAFF_LIST.forEach(staff => {
      let row = [`"${staff}"`];
      activeMonthConfig.daysArray.forEach(day => {
        const dateStr = `${activeMonthConfig.monthStr}-${day < 10 ? '0' + day : day}`;
        const pattern = matrixShifts[`${staff}-${dateStr}`] || 'O';
        const hasCarat = isRequestedByStaff(staff, dateStr, pattern);
        const cellVal = hasCarat ? `${pattern}^` : pattern;
        row.push(`"${cellVal}"`);
      });
      const totalMins = calculateTotalMinutes(staff);
      row.push(`"${(totalMins / 60).toFixed(1)} hrs"`);
      csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OTA_Duty_${activeMonthConfig.monthStr}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'SJam_2823') {
      setIsAdmin(true);
      setShowLoginModal(false);
      setAdminPassword('');
      setActiveTab('board2');
    } else {
      alert('密碼錯誤！');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      
      {/* 壓縮版 Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[99%] mx-auto px-2 py-1.5 flex justify-between items-center gap-2">
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-sm border border-slate-700">
              😎
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                OTA Duty Request
                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-900 text-emerald-400 hidden sm:inline">明愛 OT</span>
              </h1>
              <p className="text-[10px] font-medium text-emerald-600 truncate">
                🔥 一切盡在呀SIR手中
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
              <button onClick={() => { setViewMonthStr(defaultConfig.monthStr); setActiveTab('board1'); }} className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${activeTab === 'board1' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600'}`}>
                📝 申請
              </button>
              <button onClick={() => setActiveTab('preview')} className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${activeTab === 'preview' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600'}`}>
                👀 預計更表
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => setActiveTab('board2')} className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${activeTab === 'board2' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600'}`}>
                    📊 總覽
                  </button>
                  <button onClick={() => setActiveTab('board3')} className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${activeTab === 'board3' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600'}`}>
                    📈 統計
                  </button>
                </>
              )}
            </div>

            {!isAdmin ? (
              <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-medium shadow-sm shrink-0">
                <Lock className="w-3 h-3 text-emerald-400" /> 登入
              </button>
            ) : (
              <button onClick={() => { setIsAdmin(false); setActiveTab('board1'); }} className="flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-medium shrink-0">
                <LogOut className="w-3 h-3" /> 登出
              </button>
            )}
          </div>

        </div>
      </header>

      {/* 主管登入 Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600" /> 主管身份驗證
              </h3>
              <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="password"
                placeholder="請輸入密碼 (XXXXXXX)"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">取消</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">登入</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-[99%] mx-auto py-4">
        
        {/* 版面 1：同事意願申請與取消 (自動固定為當前目標月份) */}
        {activeTab === 'board1' && (
          <div className="max-w-6xl mx-auto space-y-4">
            
            {/* 截更提示 Banner */}
            {defaultConfig.isLocked && !isAdmin && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-sm">
                <LockKeyhole className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold">【本月報更已截止鎖定】</span>
                  <p className="text-[11px] text-rose-700 mt-0.5">每月 22 號 23:59 後停止接收更次變更。如有緊急調更，請直接聯絡呀 SIR。</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" /> 填寫 【{defaultConfig.targetYear} 年 {defaultConfig.targetMonthNum} 月】 更期申請
                </span>
                <span className="text-[11px] font-normal px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                  截更日: 每月22號
                </span>
              </h2>

              <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs sm:text-sm">
                
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">選擇您的姓名</label>
                  <select 
                    value={selectedStaff} 
                    onChange={(e) => setSelectedStaff(e.target.value)} 
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                    disabled={defaultConfig.isLocked && !isAdmin}
                  >
                    <option value="" disabled className="text-slate-400">
                      -- 請選擇您的姓名 --
                    </option>
                    {STAFF_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
{/* 選擇 Duty Pattern (改為一行過排版) */}
<div>
  <label className="block font-semibold text-slate-700 text-mb-1.5 text-xs">選擇 Duty Pattern</label>
  <div className="flex flex-wrap gap-1.5">
    {DUTY_PATTERNS.map(p => (
      <button
        key={p.id}
        type="button"
        onClick={() => { if (!defaultConfig.isLocked || isAdmin) setSelectedPattern(p.id); }}
        className={`py-2 px-2.5 rounded-md border text-center transition-all flex-1 min-w-[70px] ${
          selectedPattern === p.id
            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        } ${defaultConfig.isLocked && !isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span className="text-xs font-bold block truncate">{p.id}</span>
      </button>
    ))}
  </div>
</div>
 {/* 📅 日期選擇區（預設收埋，點擊後彈出視窗） */}
<div className="mb-4">
  <div className="flex items-center justify-between mb-1">
    <label className="block font-semibold text-slate-700 text-xs">
      選擇日期 ({activeMonthConfig.monthStr})
    </label>
    <button
      type="button"
      onClick={() => setIsCalendarOpen(true)}
      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-xs"
    >
      📅 {selectedDates.length > 0 ? `已選 ${selectedDates.length} 日: ${selectedDates[0]} ...` : '點擊選擇日期 / 連假'}
    </button>
  </div>
</div>

{/* 彈出式 Modal 日曆視窗 (當 isCalendarOpen 係 true 時先彈出) */}
{isCalendarOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-4 animate-in fade-in zoom-in-95 duration-150">
      
      {/* 彈窗標題與關閉掣 */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">選擇更期日期 ({activeMonthConfig.monthStr})</h3>
          <p className="text-[11px] text-slate-500">
            {selectedPattern === 'AL' && '✨ AL 可連續選取最多 5 天'}
            {(selectedPattern === 'CL' || selectedPattern === '育嬰假') && '✨ 該假別可連續選取最多 3 天'}
            {selectedPattern === 'ML' && '✨ ML 可不限日數連選'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCalendarOpen(false)}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
        >
          ✕
        </button>
      </div>

      {/* 網格日曆 Grid */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs mb-4">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <div key={d} className="font-bold text-slate-400 py-1 text-[11px]">{d}</div>
        ))}

        {activeMonthConfig.daysArray.map((dayNum) => {
          const formattedDay = String(dayNum).padStart(2, '0');
          const dateStr = `${activeMonthConfig.monthStr}-${formattedDay}`;

          const isSelected = selectedDates.includes(dateStr);
          const isStart = rangeStartDate === dateStr;

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => handleDateClick(dateStr)}
              className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isStart
                  ? 'bg-emerald-200 text-emerald-900 border-2 border-emerald-600'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-200 border border-slate-100'
              }`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* 底部確認按鈕 */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-xs font-semibold text-emerald-700">
          已選取：{selectedDates.length} 天
        </span>
        <button
          type="button"
          onClick={() => setIsCalendarOpen(false)}
          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          確定完成
        </button>
      </div>

    </div>
  </div>
  )}

 {/* 📅 每日申請人名詳情卡片 */}
{selectedDates.length > 0 && (
  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
    <div className="flex items-center justify-between font-semibold text-slate-700">
      <span>📅 選擇日期申請狀況與人名：</span>
      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
        共 {requests.filter(r => selectedDates.includes(r.request_date)).length} 項申請
      </span>
    </div>

    {selectedDates.map(dateStr => {
      const dayReqs = requests.filter(r => r.request_date === dateStr);
      return (
        <div key={dateStr} className="bg-white p-2 rounded border border-slate-100">
          <div className="font-bold text-slate-600 mb-1">{dateStr}</div>
          {dayReqs.length === 0 ? (
            <div className="text-slate-400 italic text-[11px]">目前暫無人申請</div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {dayReqs.map((req, idx) => (
                <span 
                  key={idx} 
                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px]"
                >
                  <span className="font-bold text-emerald-900">{req.staff_name}</span>
                  <span className="bg-emerald-600 text-white px-1 rounded text-[10px]">{req.pattern}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      );
    })}
  </div>
)}
 
{/* 簡化版 Excel 矩陣實況表 (Staff x Date) */}
<div className="mt-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
<div className="flex items-center justify-between mb-3">
    <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
      📊 {defaultConfig.targetMonthNum}月份 OTA Request 簡化版 Excel 實況表
    </h3>
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
        每5秒自動更新
      </span>
      <button
        onClick={() => fetchData()}
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors active:scale-95"
        title="手動刷新資料"
      >
        🔄 刷新
      </button>
    </div>
  </div>

 <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
    <table className="w-full text-center text-[11px] border-collapse">
      <thead>
        <tr className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200">
          <th className="p-2 border-r border-slate-200 font-semibold sticky left-0 bg-slate-100 z-20 min-w-[70px]">
            同事
          </th>
          {activeMonthConfig.daysArray.map((dayNum) => {
            const formattedDay = String(dayNum).padStart(2, '0');
            return (
              <th key={dayNum} className="p-2 border-r border-slate-200 font-medium whitespace-nowrap min-w-[45px]">
                {formattedDay}日
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {STAFF_LIST.map((staffName) => (
          <tr key={staffName} className="hover:bg-slate-50">
            {/* 同事姓名欄位 (固定在左側) */}
            <td className="p-2 border-r border-slate-200 font-bold bg-slate-50 sticky left-0 z-10 text-slate-700 text-left">
              {staffName}
            </td>

            {/* 各日期的 Request 狀態 */}
            {activeMonthConfig.daysArray.map((dayNum) => {
              const formattedDay = String(dayNum).padStart(2, '0');
              const dateStr = `${activeMonthConfig.monthStr}-${formattedDay}`;

              const matchedReq = requests.find(
                (r) => r.request_date === dateStr && r.staff_name === staffName
              );

              return (
                <td key={dateStr} className="p-1.5 border-r border-slate-100">
                  {matchedReq ? (
                    <span className="inline-block px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px] border border-emerald-300 shadow-xs">
                      {matchedReq.pattern}
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
                <button 
                  type="submit" 
                  disabled={defaultConfig.isLocked && !isAdmin}
                  className={`w-full font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs shadow-sm transition-all ${
                    defaultConfig.isLocked && !isAdmin 
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" /> {defaultConfig.isLocked && !isAdmin ? '已截止報更' : '提交 Request'}
                </button>
              </form>

              {warningMsg && <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />{warningMsg}</div>}
              {successMsg && <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />{successMsg}</div>}
            </div>

            {/* 已提交列表與取消按鈕 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>📋 [{selectedStaff || '未選擇姓名'}] {defaultConfig.targetMonthNum}月份已提交更次</span>
                <span className="text-[11px] font-normal text-slate-500">共 {requests.filter(r => r.staff_name === selectedStaff).length} 項</span>
              </h3>

              {!selectedStaff ? (
                <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  請先在上方選擇您的姓名以查看已提交的申請。
                </p>
              ) : requests.filter(r => r.staff_name === selectedStaff).length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  目前沒有任何已提交的更次申請。
                </p>
              ) : (
                <div className="space-y-2">
                  {requests.filter(r => r.staff_name === selectedStaff).map((req, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">{req.request_date}</span>
                        <span className="font-semibold text-slate-800">{req.pattern}</span>
                      </div>
                      
                      {(!defaultConfig.isLocked || isAdmin) && (
                        <button
                          onClick={async () => {
                            if (confirm(`確定要取消 ${req.request_date} 的 [${req.pattern}] 申請嗎？`)) {
                              await supabase.from('staff_requests').delete().eq('staff_name', req.staff_name).eq('request_date', req.request_date);
                              await supabase.from('duty_schedules').upsert([{ staff_name: req.staff_name, duty_date: req.request_date, pattern: 'O' }], { onConflict: 'staff_name,duty_date' });
                              setSuccessMsg(`🗑️ 已成功取消 ${req.request_date} 的更次申請！`);
                              fetchData();
                            }
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded text-[11px] font-medium flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> 取消
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 版面 2：預計更表 */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-600" /> 【{activeMonthConfig.year} 年 {activeMonthConfig.monthNum} 月】預計更期與即時撞期監控
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">左右滑動表格可檢視全月更期。</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b">
                      <th className="p-2 font-bold min-w-[130px] max-w-[130px] sticky left-0 bg-slate-100 z-10 border-r shadow-sm truncate">員工姓名</th>
                      {activeMonthConfig.daysArray.map(day => (
                        <th key={day} className="p-1.5 text-center min-w-[65px] max-w-[65px] border-l font-semibold">{activeMonthConfig.monthNum}/{day}</th>
                      ))}
                      <th className="p-2 text-center font-bold min-w-[90px] max-w-[90px] sticky right-0 bg-slate-100 z-10 border-l shadow-sm">全月工時</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {STAFF_LIST.map(staff => {
                      const totalMins = calculateTotalMinutes(staff);
                      const totalHrs = (totalMins / 60).toFixed(1);

                      return (
                        <tr key={staff} className="hover:bg-slate-50">
                          <td className="p-2 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r shadow-sm truncate max-w-[130px]">{staff}</td>
                          {activeMonthConfig.daysArray.map(day => {
                            const dateStr = `${activeMonthConfig.monthStr}-${day < 10 ? '0' + day : day}`;
                            const currentVal = matrixShifts[`${staff}-${dateStr}`] || 'O';
                            const hasRequested = isRequestedByStaff(staff, dateStr, currentVal);

                            const isAnOver = currentVal === 'AN' && getDayPatternCount(dateStr, 'AN') > 1;
                            const isMidOver = currentVal === '1000-1848' && getDayPatternCount(dateStr, '1000-1848') > 1;
                            const hasWarning = isAnOver || isMidOver;

                            return (
                              <td key={day} className={`p-0.5 border-l text-center ${hasWarning ? 'bg-rose-50' : ''}`}>
                                <div className={`p-1 text-[10px] font-semibold rounded truncate ${
                                  currentVal === '0800-1648' ? 'bg-emerald-50 text-emerald-800' :
                                  currentVal === '1000-1848' ? 'bg-blue-50 text-blue-800' :
                                  currentVal === '1330-2218' ? 'bg-amber-50 text-amber-800' :
                                  currentVal === 'AN' ? 'bg-purple-50 text-purple-800' :
                                  ['AL', 'CL', 'ML', '育嬰假'].includes(currentVal) ? 'bg-teal-50 text-teal-800' :
                                  'bg-slate-50 text-slate-400'
                                }`}>
                                  {currentVal}{hasRequested ? '^' : ''}
                                  {hasWarning && <span className="block text-[8px] text-rose-600 font-bold">⚠️撞</span>}
                                </div>
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-bold text-slate-700 sticky right-0 bg-white z-10 border-l shadow-sm text-[10px]">{totalHrs}h</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 版面 3：主管 Excel 全月矩陣 (支援切換歷史月份) */}
        {activeTab === 'board2' && isAdmin && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-emerald-600" /> 主管全月總覽與匯出 Excel
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">可自由選擇切換月份，隨時查閱或編輯過去的更表。</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* 歷史月份選擇器 */}
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-xs font-semibold text-slate-700">月份:</span>
                  <select 
                    value={viewMonthStr} 
                    onChange={(e) => setViewMonthStr(e.target.value)}
                    className="bg-transparent text-xs font-bold text-emerald-800 focus:outline-none cursor-pointer"
                  >
                    {historyMonthOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> 📥 匯出 Excel
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b">
                      <th className="p-2 font-bold min-w-[130px] max-w-[130px] sticky left-0 bg-slate-100 z-10 border-r shadow-sm truncate">員工姓名</th>
                      {activeMonthConfig.daysArray.map(day => (
                        <th key={day} className="p-1.5 text-center min-w-[70px] max-w-[70px] border-l font-semibold">{activeMonthConfig.monthNum}/{day}</th>
                      ))}
                      <th className="p-2 text-center font-bold min-w-[110px] border-l bg-slate-100">DO/O 規則</th>
                      <th className="p-2 text-center font-bold min-w-[95px] max-w-[95px] sticky right-0 bg-slate-100 z-10 border-l shadow-sm">總工時</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {STAFF_LIST.map(staff => {
                      const totalMins = calculateTotalMinutes(staff);
                      const totalHrs = (totalMins / 60).toFixed(1);
                      const isExact = totalMins === 10560;
                      const isShort = totalMins < 10560;
                      const offCheck = checkOffRules(staff);

                      return (
                        <tr key={staff} className="hover:bg-slate-50">
                          <td className="p-2 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r shadow-sm truncate max-w-[130px]">{staff}</td>
                          {activeMonthConfig.daysArray.map(day => {
                            const dateStr = `${activeMonthConfig.monthStr}-${day < 10 ? '0' + day : day}`;
                            const currentVal = matrixShifts[`${staff}-${dateStr}`] || 'O';
                            const hasRequested = isRequestedByStaff(staff, dateStr, currentVal);

                            return (
                              <td key={day} className="p-0.5 border-l text-center">
                                <div className="flex items-center gap-0.5">
                                  <select
                                    value={currentVal}
                                    onChange={(e) => handleMatrixChange(staff, day, e.target.value)}
                                    className={`w-full p-1 text-[10px] font-semibold rounded border ${
                                      currentVal === '0800-1648' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                      currentVal === '1000-1848' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                                      currentVal === '1330-2218' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                      currentVal === 'AN' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                                      ['AL', 'CL', 'ML', '育嬰假'].includes(currentVal) ? 'bg-teal-50 text-teal-800 border-teal-300' :
                                      'bg-slate-50 text-slate-400 border-slate-200'
                                    }`}
                                  >
                                    {DUTY_PATTERNS.map(p => (
                                      <option key={p.id} value={p.id}>{p.id}</option>
                                    ))}
                                  </select>
                                  {hasRequested && <span className="text-emerald-600 font-bold text-[10px]" title="同事 Request">^</span>}
                                </div>
                              </td>
                            );
                          })}
                          
                          <td className="p-1.5 border-l text-center">
                            {offCheck.hasError ? (
                              <div className="p-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[9px]">
                                ⚠️ 不合規 ({offCheck.totalDO}/4)
                              </div>
                            ) : (
                              <div className="p-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px] flex items-center justify-center gap-0.5">
                                <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> 合規 (4)
                              </div>
                            )}
                          </td>

                          <td className="p-2 text-center sticky right-0 bg-white z-10 border-l shadow-sm">
                            <div className={`px-1.5 py-1 rounded font-bold text-[10px] ${
                              isExact ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              isShort ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {totalHrs}h
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 版面 4：公平分派統計 (支援切換歷史月份) */}
        {activeTab === 'board3' && isAdmin && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" /> 公平分派統計 (AN & P 班總次數)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">實時統計每位同事於選定月份申請的 Request、AN 及 P 班總次數。</p>
              </div>

              {/* 歷史月份選擇器 */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-xs font-semibold text-slate-700">月份:</span>
                <select 
                  value={viewMonthStr} 
                  onChange={(e) => setViewMonthStr(e.target.value)}
                  className="bg-transparent text-xs font-bold text-emerald-800 focus:outline-none cursor-pointer"
                >
                  {historyMonthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b">
                    <th className="p-2.5 font-semibold">員工姓名</th>
                    <th className="p-2.5 text-center font-semibold">Request 總次數</th>
                    <th className="p-2.5 text-center font-semibold text-purple-700">AN 總次數</th>
                    <th className="p-2.5 text-center font-semibold text-amber-700">P 總次數</th>
                    <th className="p-2.5 text-center font-semibold">全月已申請總工時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {STAFF_LIST.map(staff => {
                    const reqCount = requests.filter(r => r.staff_name === staff).length;
                    let anCount = 0;
                    let pCount = 0;

                    activeMonthConfig.daysArray.forEach(day => {
                      const dateStr = `${activeMonthConfig.monthStr}-${day < 10 ? '0' + day : day}`;
                      const pattern = matrixShifts[`${staff}-${dateStr}`];
                      if (pattern === 'AN') anCount++;
                      if (pattern === '1330-2218') pCount++;
                    });

                    const totalMins = calculateTotalMinutes(staff);

                    return (
                      <tr key={staff} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-900">{staff}</td>
                        <td className="p-2.5 text-center font-medium text-slate-700">{reqCount} 次</td>
                        <td className="p-2.5 text-center font-bold text-purple-700 bg-purple-50/50">{anCount} 次</td>
                        <td className="p-2.5 text-center font-bold text-amber-700 bg-amber-50/50">{pCount} 次</td>
                        <td className="p-2.5 text-center font-bold text-emerald-700">{(totalMins / 60).toFixed(1)} 小時</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}