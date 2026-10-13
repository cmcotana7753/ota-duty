'use client';

import { useState, useEffect } from 'react';
import { Calendar, Users, Clock, AlertTriangle, Send, CheckCircle2, Shield, BarChart3, Edit3, Lock, Unlock, LogOut, Eye, CheckCircle } from 'lucide-react';
import { supabase } from './lib/supabase';

// 23 位完整同事名單
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
  { id: 'AN', label: 'AN (AN)', mins: 966, hours: 16.1, desc: '每日限 1 人 (966 分鐘)' },
  { id: 'N', label: 'N (夜更)', mins: 528, hours: 8.8, desc: '夜更 (528 分鐘)' },
   { id: 'AL', label: 'AL (年假)', mins: 528, hours: 8.8, desc: '年假 (計算工時 8.8hrs)' },
  { id: 'CL', label: 'CL (恩恤假)', mins: 528, hours: 8.8, desc: '恩恤假 (計算工時 8.8hrs)' },
  { id: 'ML', label: 'ML (產假)', mins: 528, hours: 8.8, desc: '產假 (計算工時 8.8hrs)' },
  { id: '育嬰假', label: '育嬰假', mins: 528, hours: 8.8, desc: '育嬰假 (計算工時 8.8hrs)' },
  { id: 'DO', label: 'DO (Day Off)', mins: 0, hours: 0, desc: 'Day Off (每月必須剛好4日)' },
  { id: 'O', label: 'O (OFF)', mins: 0, hours: 0, desc: 'Off (每週一至日必須至少1日)' },
];

export default function OtaDutyApp() {
  const [activeTab, setActiveTab] = useState<'board1' | 'preview' | 'board2' | 'board3'>('board1');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const [selectedStaff, setSelectedStaff] = useState(STAFF_LIST[0]);
  const [selectedDate, setSelectedDate] = useState('2026-10-15');
  const [selectedPattern, setSelectedPattern] = useState(DUTY_PATTERNS[0].id);
  
  const [requests, setRequests] = useState<{ staff_name: string; request_date: string; pattern: string }[]>([]);
  const [matrixShifts, setMatrixShifts] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  // 2026年10月 按星期一至星期日分組的週次 (Weeks Mon-Sun)
  const weeks = [
    { name: 'W1', days: [1, 2, 3, 4] },              // 10/1(Thu) - 10/4(Sun)
    { name: 'W2', days: [5, 6, 7, 8, 9, 10, 11] },    // Mon - Sun
    { name: 'W3', days: [12, 13, 14, 15, 16, 17, 18] },// Mon - Sun
    { name: 'W4', days: [19, 20, 21, 22, 23, 24, 25] },// Mon - Sun
    { name: 'W5', days: [26, 27, 28, 29, 30, 31] }     // Mon - Sat
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: reqData } = await supabase.from('staff_requests').select('*').order('created_at', { ascending: false });
    if (reqData) setRequests(reqData);

    const { data: dutyData } = await supabase.from('duty_schedules').select('*');
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

    const userReqCount = requests.filter(r => r.staff_name === selectedStaff).length + 1;
    if (userReqCount > 4) {
      setWarningMsg(`⚠️ 提醒：${selectedStaff} 本月更次請求已達 ${userReqCount} 次！呀SIR開始唔高興。`);
    }

    const { error: reqError } = await supabase.from('staff_requests').insert([
      { staff_name: selectedStaff, request_date: selectedDate, pattern: selectedPattern }
    ]);

    if (reqError) {
      alert('儲存失敗: ' + reqError.message);
      return;
    }

    await supabase.from('duty_schedules').upsert([
      { staff_name: selectedStaff, duty_date: selectedDate, pattern: selectedPattern }
    ], { onConflict: 'staff_name,duty_date' });

    setSuccessMsg(`✅ 成功提交 ${selectedDate} 的 [${selectedPattern}] 申請！比D時間呀SIR諗諗`);
    fetchData();
  };

  const handleMatrixChange = async (staff: string, day: number, newPattern: string) => {
    const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
    setMatrixShifts(prev => ({ ...prev, [`${staff}-${dateStr}`]: newPattern }));

    await supabase.from('duty_schedules').upsert([
      { staff_name: staff, duty_date: dateStr, pattern: newPattern }
    ], { onConflict: 'staff_name,duty_date' });
  };

  const calculateTotalMinutes = (staff: string) => {
    let totalMins = 0;
    daysInMonth.forEach(day => {
      const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
      const patternId = matrixShifts[`${staff}-${dateStr}`] || 'O';
      const patternObj = DUTY_PATTERNS.find(p => p.id === patternId);
      if (patternObj) totalMins += patternObj.mins;
    });
    return totalMins;
  };

  // 驗證 DO/O 條件邏輯
  const checkOffRules = (staff: string) => {
    let totalDO = 0;
    let missingOInWeek = false;
    let doExceededInWeek = false;

    // 計算當月總 DO
    daysInMonth.forEach(day => {
      const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
      if (matrixShifts[`${staff}-${dateStr}`] === 'DO') {
        totalDO++;
      }
    });

    // 檢查每週 O 與 DO 限制 (Mon to Sun)
    weeks.forEach(w => {
      let oCount = 0;
      let doCount = 0;
      w.days.forEach(day => {
        const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
        const p = matrixShifts[`${staff}-${dateStr}`] || 'O';
        if (p === 'O') oCount++;
        if (p === 'DO') doCount++;
      });

      // 完整週 (7 天) 必須至少 1 個 O
      if (w.days.length >= 7 && oCount < 1) {
        missingOInWeek = true;
      }
      // 單週 DO 不能超過 2 天
      if (doCount > 2) {
        doExceededInWeek = true;
      }
    });

    const isDoValid = totalDO === 4;
    return {
      totalDO,
      isDoValid,
      missingOInWeek,
      doExceededInWeek,
      hasError: !isDoValid || missingOInWeek || doExceededInWeek
    };
  };

  const getDayPatternCount = (dateStr: string, patternId: string) => {
    let count = 0;
    STAFF_LIST.forEach(staff => {
      if (matrixShifts[`${staff}-${dateStr}`] === patternId) {
        count++;
      }
    });
    return count;
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
      {/* 頂部導覽列 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[98%] mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-600" /> 麻醉助理更期管理系統
            </h1>
            <p className="text-xs text-slate-500">Caritas Medical Centre - Operating Theatre</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button onClick={() => setActiveTab('board1')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'board1' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>
                📝 申請更期
              </button>
              <button onClick={() => setActiveTab('preview')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'preview' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>
                👀 預計更表 (唔好同人撞DUTY)
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => setActiveTab('board2')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'board2' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>
                    📊 同事工時總覽
                  </button>
                  <button onClick={() => setActiveTab('board3')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'board3' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>
                    📈 統計
                  </button>
                </>
              )}
            </div>

            {!isAdmin ? (
              <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-sm">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> 主管登入
              </button>
            ) : (
              <button onClick={() => { setIsAdmin(false); setActiveTab('board1'); }} className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium">
                <LogOut className="w-3.5 h-3.5" /> 登出
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
                placeholder="請輸入密碼 (XXXXXXXX)"
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

      {/* 內容區塊 */}
      <div className="max-w-[98%] mx-auto py-6">
        
        {/* 版面 1：同事意願申請 */}
        {activeTab === 'board1' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> 心水更期 (Staff Request)
            </h2>
            <form onSubmit={handleSubmitRequest} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">選擇您的姓名</label>
                <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white">
                  {STAFF_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">選擇日期</label>
                <input type="date" value={selectedDate} min="2026-10-01" max="2026-10-31" onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-300" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">選擇 Duty Pattern</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DUTY_PATTERNS.map(p => (
                    <div key={p.id} onClick={() => setSelectedPattern(p.id)} className={`p-3 rounded-lg border cursor-pointer ${selectedPattern === p.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200'}`}>
                      <div className="font-semibold text-sm">{p.id}</div>
                      <div className="text-xs text-slate-500">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> 提交 Request
              </button>
            </form>
            {warningMsg && <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />{warningMsg}</div>}
            {successMsg && <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />{successMsg}</div>}
          </div>
        )}

        {/* 版面：預計更表 */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-emerald-600" /> 預計更表 (唔好同人撞DUTY)
                </h2>
                <p className="text-sm text-slate-500 mt-1">即時顯示所有 23 位同事登記的更次。如有 AN 或中班超額會亮粉紅警告。</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b">
                      <th className="p-3 font-bold min-w-[170px] sticky left-0 bg-slate-100 z-10 border-r shadow-sm">員工姓名</th>
                      {daysInMonth.map(day => (
                        <th key={day} className="p-2 text-center min-w-[95px] border-l font-semibold">
                          10/{day}
                        </th>
                      ))}
                      <th className="p-3 text-center font-bold min-w-[140px] sticky right-0 bg-slate-100 z-10 border-l shadow-sm">
                        全月預計工時
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {STAFF_LIST.map(staff => {
                      const totalMins = calculateTotalMinutes(staff);
                      const totalHrs = (totalMins / 60).toFixed(1);

                      return (
                        <tr key={staff} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r shadow-sm">
                            {staff}
                          </td>
                          {daysInMonth.map(day => {
                            const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
                            const currentVal = matrixShifts[`${staff}-${dateStr}`] || 'O';
                            
                            const isAnOver = currentVal === 'AN' && getDayPatternCount(dateStr, 'AN') > 1;
                            const isMidOver = currentVal === '1000-1848' && getDayPatternCount(dateStr, '1000-1848') > 1;
                            const hasWarning = isAnOver || isMidOver;

                            return (
                              <td key={day} className={`p-1 border-l text-center ${hasWarning ? 'bg-rose-50' : ''}`}>
                                <div className={`p-1.5 text-[11px] font-semibold rounded ${
                                  currentVal === '0800-1648' ? 'bg-emerald-50 text-emerald-800' :
                                  currentVal === '1000-1848' ? 'bg-blue-50 text-blue-800' :
                                  currentVal === '1330-2218' ? 'bg-amber-50 text-amber-800' :
                                  currentVal === 'AN' ? 'bg-purple-50 text-purple-800' :
                                  ['AL', 'CL', 'ML', '育嬰假'].includes(currentVal) ? 'bg-teal-50 text-teal-800' :
                                  'bg-slate-50 text-slate-400'
                                }`}>
                                  {currentVal}
                                  {hasWarning && <span className="block text-[9px] text-rose-600 font-bold">⚠️ 撞期</span>}
                                </div>
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-bold text-slate-700 sticky right-0 bg-white z-10 border-l shadow-sm">
                            {totalHrs} hrs
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

        {/* 版面 2：主管 Excel 全月矩陣與 DO/O 自動驗證 */}
        {activeTab === 'board2' && isAdmin && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-emerald-600" /> 主管全月矩陣總覽、176 小時工時與 DO/O 合規檢查
                </h2>
                <p className="text-sm text-slate-500 mt-1">自動驗證：每週(Mon-Sun)必須包含 $\ge 1$ 日 O；全月 DO 必須剛好 4 天且單週 $\le 2$ 天 DO。</p>
              </div>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-sm font-semibold">
                月目標：10,560 分鐘 (176.0 小時)
              </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b">
                      <th className="p-3 font-bold min-w-[170px] sticky left-0 bg-slate-100 z-10 border-r shadow-sm">員工姓名</th>
                      {daysInMonth.map(day => (
                        <th key={day} className="p-2 text-center min-w-[95px] border-l font-semibold">
                          10/{day}
                        </th>
                      ))}
                      <th className="p-3 text-center font-bold min-w-[160px] border-l bg-slate-100">
                        DO/O 規則檢查
                      </th>
                      <th className="p-3 text-center font-bold min-w-[170px] sticky right-0 bg-slate-100 z-10 border-l shadow-sm">
                        全月總工時 (目標 10560m)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {STAFF_LIST.map(staff => {
                      const totalMins = calculateTotalMinutes(staff);
                      const totalHrs = (totalMins / 60).toFixed(1);
                      const isExact = totalMins === 10560;
                      const isShort = totalMins < 10560;

                      // 檢查 DO / O 規則
                      const offCheck = checkOffRules(staff);

                      return (
                        <tr key={staff} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r shadow-sm">
                            {staff}
                          </td>
                          {daysInMonth.map(day => {
                            const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
                            const currentVal = matrixShifts[`${staff}-${dateStr}`] || 'O';
                            return (
                              <td key={day} className="p-1 border-l text-center">
                                <select
                                  value={currentVal}
                                  onChange={(e) => handleMatrixChange(staff, day, e.target.value)}
                                  className={`w-full p-1 text-[11px] font-semibold rounded border ${
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
                              </td>
                            );
                          })}
                          
                          {/* DO/O 合規狀態欄 */}
                          <td className="p-2 border-l text-center">
                            {offCheck.hasError ? (
                              <div className="p-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
                                ⚠️ 不合規
                                {offCheck.totalDO !== 4 && <span className="block text-[9px] font-normal">DO 總數: {offCheck.totalDO}/4 天</span>}
                                {offCheck.missingOInWeek && <span className="block text-[9px] font-normal">某週缺少 O</span>}
                                {offCheck.doExceededInWeek && <span className="block text-[9px] font-normal">單週 DO &gt; 2 天</span>}
                              </div>
                            ) : (
                              <div className="p-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] flex items-center justify-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" /> 完美合規 (DO: 4天)
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-center sticky right-0 bg-white z-10 border-l shadow-sm">
                            <div className={`px-2 py-1 rounded-md font-bold text-xs ${
                              isExact ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              isShort ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {totalHrs} hrs ({totalMins}m)
                              <span className="block text-[10px] font-normal mt-0.5">
                                {isExact ? '✓ 剛好達標' : isShort ? `缺 ${((10560 - totalMins)/60).toFixed(1)}h` : `OT +${((totalMins - 10560)/60).toFixed(1)}h`}
                              </span>
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

        {/* 版面 3：統計與透明度 */}
        {activeTab === 'board3' && isAdmin && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" /> 版面 3：全月 Request 統計
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b">
                    <th className="p-3 font-semibold">員工姓名</th>
                    <th className="p-3 text-center font-semibold">本月 Request 總次數</th>
                    <th className="p-3 text-center font-semibold">全月已排總工時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {STAFF_LIST.map(staff => {
                    const count = requests.filter(r => r.staff_name === staff).length;
                    const totalMins = calculateTotalMinutes(staff);
                    return (
                      <tr key={staff} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">{staff}</td>
                        <td className="p-3 text-center font-medium text-slate-700">{count} 次</td>
                        <td className="p-3 text-center font-bold text-emerald-700">{(totalMins / 60).toFixed(1)} 小時 ({totalMins}m)</td>
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