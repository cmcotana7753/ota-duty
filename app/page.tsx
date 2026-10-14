'use client';

import { useState, useEffect, useMemo } from 'react';
import {
Calendar, Users, Clock, AlertTriangle, Send, CheckCircle2,
Shield, BarChart3, Edit3, Lock, Unlock, LogOut, Eye, Download,
CheckCircle, Trash2, LockKeyhole, ChevronDown, Plus, Settings
} from 'lucide-react';
import { supabase } from './lib/supabase';

// 預設備用資料（若資料庫尚未初始化時使用）
const DEFAULT_STAFF_LIST = [
  'Tong Yiu Bun', 'Ng Wai Hung Samuel', 'Chan Kai Ming', 'Lai Tsing Yin',
  'Huang Xiuyi Apple', 'Lau Man Ting', 'Fung Hing Pui Christy', 'Chu Ka Chun John',
  'Ye Shuyi Candy', 'Lam Ngan Sze Jessie', 'Au Yeung Sze Man Carman', 'Cheung Ming Ying',
  'To Kai Kei', 'Cheung Ming Lai Lily', 'Lai Hiu Tung', 'Fung Oi Lin PoPo',
  'Lau Man Wa', 'Lam Yan Tung Jasmine', 'Lam Yan Ling Emma', 'Zhang Shenjun',
  'Leung Ka Ki', 'Lo Hiu Yu', 'Wong Hei Laam, Hazel'
];

const DEFAULT_DUTY_PATTERNS = [
  { id: '0800-1648', label: '0800-1648 (A)', mins: 528, hours: 8.8, desc: '平日>=6人, 假期/週末3人' },
  { id: '1000-1848', label: '1000-1848 (10點)', mins: 528, hours: 8.8, desc: '每日限 1 人' },
  { id: '1330-2218', label: '1330-2218 (P)', mins: 528, hours: 8.8, desc: '平日2人, 假期/週末1人' },
  { id: 'AN', label: 'AN (ANight)', mins: 966, hours: 16.1, desc: '每日限 1 人' },
  { id: 'AL', label: 'AL (年假)', mins: 528, hours: 8.8, desc: '年假' },
  { id: 'CL', label: 'CL (恩恤假)', mins: 528, hours: 8.8, desc: '恩恤假' },
  { id: 'ML', label: 'ML (產假)', mins: 528, hours: 8.8, desc: '產假' },
  { id: '育嬰假', label: '育嬰假', mins: 528, hours: 8.8, desc: '育嬰假' },
  { id: 'DO', label: 'DO (Day Off)', mins: 0, hours: 0, desc: 'Day Off (每月剛好4日)' },
  { id: 'O', label: 'O (休假)', mins: 0, hours: 0, desc: '休假 (每月剛好4日)' },
];

export default function OtaDutyApp() {
  const [activeTab, setActiveTab] = useState<'board1' | 'preview' | 'board2' | 'board3' | 'adminSettings'>('board1');
  const [rangeStartDate, setRangeStartDate] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 動態資料庫狀態
  const [staffList, setStaffList] = useState<string[]>(DEFAULT_STAFF_LIST);
  const [dutyPatterns, setDutyPatterns] = useState<any[]>(DEFAULT_DUTY_PATTERNS);

  // 新增/刪除人名或更期的暫存 State
  const [newStaffNameInput, setNewStaffNameInput] = useState('');
  const [newPatternId, setNewPatternId] = useState('');
  const [newPatternMins, setNewPatternMins] = useState(528);

  // 1. 全自動計算預設目標月份
  const [defaultConfig, setDefaultConfig] = useState({
    targetYear: 2026,
    targetMonthNum: 11,
    isLocked: false,
    monthStr: '2026-11'
  });

  const [viewMonthStr, setViewMonthStr] = useState('2026-11');
  const [historyMonthOptions, setHistoryMonthOptions] = useState<{ label: string; value: string }[]>([]);

  // 預設 state
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-11-01');
  const [selectedPattern, setSelectedPattern] = useState(DEFAULT_DUTY_PATTERNS[0].id);

  const [requests, setRequests] = useState<{
    duty_pattern: string; staff_name: string; request_date: string; pattern: string
  }[]>([]);
  const [matrixShifts, setMatrixShifts] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  // 初始化與讀取設定
  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();

    const targetDateObj = new Date(currentYear, currentMonth + 1, 1);
    const targetYear = targetDateObj.getFullYear();
    const targetMonthNum = targetDateObj.getMonth() + 1;

    const isLocked = currentDate > 22;
    const monthStr = `${targetYear}-${targetMonthNum < 10 ? '0' + targetMonthNum : targetMonthNum}`;

    setDefaultConfig({ targetYear, targetMonthNum, isLocked, monthStr });
    setViewMonthStr(monthStr);
    setSelectedDate(`${monthStr}-01`);

    const options = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const str = `${y}-${m < 10 ? '0' + m : m}`;
      options.push({ label: `${y} 年 ${m} 月`, value: str });
    }
    setHistoryMonthOptions(options);

    fetchMetaSettings();
  }, []);

  // 從 Supabase 抓取動態人名及 Duty Pattern 設定
  const fetchMetaSettings = async () => {
    try {
      const { data: staffData } = await supabase.from('staff_list').select('*');
      if (staffData && staffData.length > 0) {
        setStaffList(staffData.map((s: any) => s.name));
      }

      const { data: patternData } = await supabase.from('duty_patterns').select('*');
      if (patternData && patternData.length > 0) {
        setDutyPatterns(patternData);
      }
    } catch (err) {
      console.log('使用預設 Hardcode 配置');
    }
  };

  const activeMonthConfig = useMemo(() => {
    const [y, m] = viewMonthStr.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return { year: y, monthNum: m, daysInMonth, daysArray, monthStr: viewMonthStr };
  }, [viewMonthStr]);

  const selectedDateStats = useMemo(() => {
    if (!selectedDate || !requests) return null;
    const dayRequests = requests.filter((r) => r.request_date === selectedDate);
    if (dayRequests.length === 0) return { total: 0, patterns: {} };

    const patternsCount = dayRequests.reduce((acc, curr) => {
      const code = curr.pattern || '其他';
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total: dayRequests.length, patterns: patternsCount };
  }, [selectedDate, requests]);

  // 載入 localStorage 名稱
  useEffect(() => {
    const savedStaff = localStorage.getItem('ota_duty_user_name');
    if (savedStaff && staffList.includes(savedStaff)) {
      setSelectedStaff(savedStaff);
    }
  }, [staffList]);

  // 處理日期點擊
  const handleDateClick = (clickedDateStr: string) => {
    let maxDays = 1;
    if (selectedPattern === 'AL') maxDays = 5;
    else if (selectedPattern === 'CL' || selectedPattern === '育嬰假') maxDays = 3;
    else if (selectedPattern === 'ML') maxDays = 31;

    if (maxDays === 1 || !rangeStartDate) {
      setRangeStartDate(clickedDateStr);
      setSelectedDate(clickedDateStr);
      setSelectedDates([clickedDateStr]);
      return;
    }

    const start = new Date(rangeStartDate);
    const end = new Date(clickedDateStr);

    if (end < start) {
      setRangeStartDate(clickedDateStr);
      setSelectedDate(clickedDateStr);
      setSelectedDates([clickedDateStr]);
      return;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > maxDays) {
      alert(`【${selectedPattern}】最多只能連續選擇 ${maxDays} 天！`);
      return;
    }

    const rangeArray: string[] = [];
    let curr = new Date(start);
    while (curr <= end) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      rangeArray.push(`${year}-${month}-${day}`);
      curr.setDate(curr.getDate() + 1);
    }

    setSelectedDates(rangeArray);
    setRangeStartDate(null);
  };

  useEffect(() => {
    fetchData();
  }, [viewMonthStr]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [viewMonthStr]);

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
      setWarningMsg('⚠️ 請先選擇您的姓名，再提交申請！');
      return;
    }

    if (selectedDates.length === 0) {
      setWarningMsg('⚠️ 請先選擇日期！');
      return;
    }

    localStorage.setItem('ota_duty_user_name', selectedStaff);

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

    setSuccessMsg(`✅ 成功提交 ${selectedDates.length} 日的 [${selectedPattern}] 更期申請！`);
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
      const patternObj = dutyPatterns.find(p => p.id === patternId);
      if (patternObj) totalMins += (patternObj.mins || 528);
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
    staffList.forEach(staff => {
      if (matrixShifts[`${staff}-${dateStr}`] === patternId) count++;
    });
    return count;
  };

  const isRequestedByStaff = (staff: string, dateStr: string, pattern: string) => {
    return requests.some(r => r.staff_name === staff && r.request_date === dateStr && r.pattern === pattern);
  };

  // 主管新增同事
  const handleAddStaff = async () => {
    if (!newStaffNameInput.trim()) return;
    const updated = [...staffList, newStaffNameInput.trim()];

    await supabase.from('staff_list').upsert([{ name: newStaffNameInput.trim() }], { onConflict: 'name' });
    setStaffList(updated);
    setNewStaffNameInput('');
    alert(`成功新增同事：${newStaffNameInput}`);
  };

  // 主管刪除同事
  const handleDeleteStaff = async (name: string) => {
    if (confirm(`確定要刪除同事 ${name} 嗎？`)) {
      await supabase.from('staff_list').delete().eq('name', name);
      setStaffList(staffList.filter(s => s !== name));
    }
  };

  // 主管新增 Duty Pattern
  const handleAddPattern = async () => {
    if (!newPatternId.trim()) return;
    const newPat = { id: newPatternId.trim(), label: newPatternId.trim(), mins: Number(newPatternMins), hours: Number(newPatternMins)/60, desc: '自定義更次' };
    await supabase.from('duty_patterns').upsert([newPat], { onConflict: 'id' });
    setDutyPatterns([...dutyPatterns, newPat]);
    setNewPatternId('');
    alert(`成功新增更次：${newPatternId}`);
  };

  // 主管刪除 Duty Pattern
  const handleDeletePattern = async (id: string) => {
    if (confirm(`確定要刪除更次 ${id} 嗎？`)) {
      await supabase.from('duty_patterns').delete().eq('id', id);
      setDutyPatterns(dutyPatterns.filter(p => p.id !== id));
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    let header = ["員工姓名", ...activeMonthConfig.daysArray.map(d => `${activeMonthConfig.monthNum}/${d}`), "全月總時數"];
    csvContent += header.join(",") + "\r\n";

    staffList.forEach(staff => {
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
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
                  <button onClick={() => setActiveTab('adminSettings')} className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${activeTab === 'adminSettings' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600'}`}>
                    ⚙️ 設定
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
                placeholder="請輸入密碼"
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
        
        {/* 版面 1：申請頁面 */}
        {activeTab === 'board1' && (
          <div className="max-w-6xl mx-auto space-y-4">
            
            {defaultConfig.isLocked && !isAdmin && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-sm">
                <LockKeyhole className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold">【本月報更已截止鎖定】</span>
                  <p className="text-[11px] text-rose-700 mt-0.5">每月 22 號 23:59 後停止接收更次變更。</p>
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
                  >
                    <option value="" disabled>-- 請選擇您的姓名 --</option>
                    {staffList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 text-xs">選擇 Duty Pattern</label>
                  <div className="flex flex-wrap gap-1.5">
                    {dutyPatterns.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPattern(p.id)}
                        className={`py-2 px-2.5 rounded-md border text-center transition-all flex-1 min-w-[70px] ${
                          selectedPattern === p.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs font-bold block truncate">{p.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 text-xs">選擇日期 ({activeMonthConfig.monthStr})</label>
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-xs"
                    >
                      📅 {selectedDates.length > 0 ? `已選 ${selectedDates.length} 日` : '點擊選擇日期 / 連假'}
                    </button>
                  </div>
                </div>

                {isCalendarOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-4">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-slate-800 text-sm">選擇更期日期 ({activeMonthConfig.monthStr})</h3>
                        <button type="button" onClick={() => setIsCalendarOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 font-bold text-xs">✕</button>
                      </div>

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
                                isSelected ? 'bg-emerald-600 text-white shadow-sm' : isStart ? 'bg-emerald-200 text-emerald-900 border-2 border-emerald-600' : 'bg-slate-50 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {dayNum}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-xs font-semibold text-emerald-700">已選取：{selectedDates.length} 天</span>
                        <button type="button" onClick={() => setIsCalendarOpen(false)} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">確定完成</button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedDates.length > 0 && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <span>📅 選擇日期申請狀況：</span>
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                        共 {requests.filter(r => selectedDates.includes(r.request_date)).length} 項申請
                      </span>
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={defaultConfig.isLocked && !isAdmin}
                  className={`w-full font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs shadow-sm transition-all ${
                    defaultConfig.isLocked && !isAdmin ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" /> 提交 Request
                </button>
              </form>

              {warningMsg && <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />{warningMsg}</div>}
              {successMsg && <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />{successMsg}</div>}
            </div>
          </div>
        )}

        {/* 版面 2：預計更表 */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-600" /> 【{activeMonthConfig.year} 年 {activeMonthConfig.monthNum} 月】預計更期與即時撞期監控
              </h2>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b">
                      <th className="p-2 font-bold min-w-[130px] sticky left-0 bg-slate-100 z-10 border-r">員工姓名</th>
                      {activeMonthConfig.daysArray.map(day => (
                        <th key={day} className="p-1.5 text-center min-w-[65px] border-l font-semibold">{activeMonthConfig.monthNum}/{day}</th>
                      ))}
                      <th className="p-2 text-center font-bold min-w-[90px] sticky right-0 bg-slate-100 z-10 border-l">全月工時</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {staffList.map(staff => {
                      const totalMins = calculateTotalMinutes(staff);
                      const totalHrs = (totalMins / 60).toFixed(1);

                      return (
                        <tr key={staff} className="hover:bg-slate-50">
                          <td className="p-2 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r truncate max-w-[130px]">{staff}</td>
                          {activeMonthConfig.daysArray.map(day => {
                            const dateStr = `${activeMonthConfig.monthStr}-${day < 10 ? '0' + day : day}`;
                            const currentVal = matrixShifts[`${staff}-${dateStr}`] || 'O';
                            const hasRequested = isRequestedByStaff(staff, dateStr, currentVal);

                            return (
                              <td key={day} className="p-0.5 border-l text-center">
                                <div className="p-1 text-[10px] font-semibold rounded bg-slate-50 text-slate-700">
                                  {currentVal}{hasRequested ? '^' : ''}
                                </div>
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-bold text-slate-700 sticky right-0 bg-white z-10 border-l text-[10px]">{totalHrs}h</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 版面 3：總覽矩陣 */}
        {activeTab === 'board2' && isAdmin && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-emerald-600" /> 主管全月總覽與匯出 Excel
              </h2>
              <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium">
                <Download className="w-3.5 h-3.5" /> 📥 匯出 Excel
              </button>
            </div>
          </div>
        )}

        {/* 新增版面：主管後台設定 (動態加減人名與 Duty Pattern) */}
        {activeTab === 'adminSettings' && isAdmin && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" /> 系統動態設定（人名與更期管理）
              </h2>

              {/* 同事名單管理 */}
              <div className="space-y-3 border-b pb-6">
                <h3 className="font-bold text-sm text-slate-700">👥 同事名單管理 ({staffList.length} 人)</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="輸入新同事全名 (例如: Peter Wong)"
                    value={newStaffNameInput}
                    onChange={(e) => setNewStaffNameInput(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-xs flex-1"
                  />
                  <button onClick={handleAddStaff} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> 新增同事
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {staffList.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium">
                      {name}
                      <button onClick={() => handleDeleteStaff(name)} className="text-rose-500 hover:text-rose-700 font-bold ml-1">✕</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Duty Pattern 管理 */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-700">⏱️ Duty Pattern 班次設定 ({dutyPatterns.length} 種)</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="班次代號 (例如: 0900-1748 或 Night)"
                    value={newPatternId}
                    onChange={(e) => setNewPatternId(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-xs flex-1"
                  />
                  <input
                    type="number"
                    placeholder="每日分鐘數 (例: 528)"
                    value={newPatternMins}
                    onChange={(e) => setNewPatternMins(Number(e.target.value))}
                    className="px-3 py-2 border rounded-lg text-xs w-32"
                  />
                  <button onClick={handleAddPattern} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> 新增更次
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {dutyPatterns.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-2.5 bg-slate-50 border rounded-lg text-xs">
                      <div>
                        <span className="font-bold text-emerald-800">{p.id}</span>
                        <span className="text-slate-500 ml-2">({p.mins || 0} 分鐘)</span>
                      </div>
                      <button onClick={() => handleDeletePattern(p.id)} className="text-rose-500 hover:text-rose-700 font-bold">刪除</button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}