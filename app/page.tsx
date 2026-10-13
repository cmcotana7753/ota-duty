'use client';

import { useState, useEffect } from 'react';
import { Calendar, Users, Clock, AlertTriangle, Send, CheckCircle2, Shield, BarChart3, Edit3, Lock, Unlock, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';

const STAFF_LIST = ['Cheuk Ho', 'Dr. Wong', 'Nurse Chan', 'Nurse Lee', 'Nurse Mary'];

const DUTY_PATTERNS = [
  { id: '0800-1648', label: '0800-1648 (日班)', hours: 8.8, desc: '平日>=6人, 假期/週末3人' },
  { id: '1000-1848', label: '1000-1848 (中班)', hours: 8.8, desc: '每日限 1 人' },
  { id: '1300-2148', label: '1300-2148 (晚班)', hours: 8.8, desc: '平日2人, 假期/週末1人' },
  { id: 'AN', label: 'AN (跨日更)', hours: 16.1, desc: 'A:0800-1418 & N:2130-0848 (每日限1人)' },
  { id: 'OFF', label: 'OFF (休假)', hours: 0, desc: '休假' },
];

export default function OtaDutyApp() {
  const [activeTab, setActiveTab] = useState<'board1' | 'board2' | 'board3'>('board1');
  
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

  // 10 月共 31 天 (1 至 31 日)
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

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
      setWarningMsg(`⚠️ 提醒：${selectedStaff} 本月更次請求已達 ${userReqCount} 次！`);
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

    setSuccessMsg(`✅ 成功提交 ${selectedDate} 的 [${selectedPattern}] 意願申請！`);
    fetchData();
  };

  const handleMatrixChange = async (staff: string, day: number, newPattern: string) => {
    const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
    setMatrixShifts(prev => ({ ...prev, [`${staff}-${dateStr}`]: newPattern }));

    await supabase.from('duty_schedules').upsert([
      { staff_name: staff, duty_date: dateStr, pattern: newPattern }
    ], { onConflict: 'staff_name,duty_date' });
  };

  // 計算特定同事成個月嘅總工時
  const calculateTotalHours = (staff: string) => {
    let total = 0;
    daysInMonth.forEach(day => {
      const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
      const patternId = matrixShifts[`${staff}-${dateStr}`] || 'OFF';
      const patternObj = DUTY_PATTERNS.find(p => p.id === patternId);
      if (patternObj) {
        total += patternObj.hours;
      }
    });
    return Math.round(total * 10) / 10;
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin123') {
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
              <Shield className="w-6 h-6 text-emerald-600" /> OTA Duty - 醫療人員更次管理系統
            </h1>
            <p className="text-xs text-slate-500">Caritas Medical Centre - Operation Theatre</p>
          </div>

          <div className="flex items-center gap-3">
            {!isAdmin ? (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
              >
                <Lock className="w-4 h-4 text-emerald-400" /> 主管登入 (Admin Login)
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button onClick={() => setActiveTab('board1')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'board1' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>
                    申請更次
                  </button>
                  <button onClick={() => setActiveTab('board2')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'board2' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>
                    主管總覽與工時
                  </button>
                  <button onClick={() => setActiveTab('board3')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'board3' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>
                    統計與透明度
                  </button>
                </div>
                <button
                  onClick={() => { setIsAdmin(false); setActiveTab('board1'); }}
                  className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" /> 登出
                </button>
              </div>
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
            <p className="text-sm text-slate-500 mb-4">請輸入主管密碼以解鎖排班總覽與 176 小時工時計算。（預設密碼：admin123）</p>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="password"
                placeholder="請輸入密碼 (admin123)"
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

      {/* 主內容區域 */}
      <div className="max-w-[98%] mx-auto py-6">
        
        {/* 版面 1：同事意願申請 */}
        {activeTab === 'board1' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> 同事更次意願請求 (Staff Request)
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

        {/* 版面 2：主管 Excel 全月矩陣 (1-31日) 與 176 小時工時計算 */}
        {activeTab === 'board2' && isAdmin && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-emerald-600" /> 主管全月矩陣總覽與 176 小時工時核對
                </h2>
                <p className="text-sm text-slate-500 mt-1">即時檢視 10 月 1 至 31 日全月更次。右側自動計算月總工時（目標：176.0 hrs）。</p>
              </div>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-sm font-semibold">
                月目標工時：176.0 小時
              </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b">
                      <th className="p-3 font-bold min-w-[130px] sticky left-0 bg-slate-100 z-10 border-r shadow-sm">員工姓名</th>
                      {daysInMonth.map(day => (
                        <th key={day} className="p-2 text-center min-w-[95px] border-l font-semibold">
                          10/{day}
                        </th>
                      ))}
                      <th className="p-3 text-center font-bold min-w-[160px] sticky right-0 bg-slate-100 z-10 border-l shadow-sm">
                        全月總工時 (目標 176h)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {STAFF_LIST.map(staff => {
                      const totalHrs = calculateTotalHours(staff);
                      const isExact = totalHrs === 176;
                      const isShort = totalHrs < 176;

                      return (
                        <tr key={staff} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r shadow-sm">
                            {staff}
                          </td>
                          {daysInMonth.map(day => {
                            const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
                            const currentVal = matrixShifts[`${staff}-${dateStr}`] || 'OFF';
                            return (
                              <td key={day} className="p-1 border-l text-center">
                                <select
                                  value={currentVal}
                                  onChange={(e) => handleMatrixChange(staff, day, e.target.value)}
                                  className={`w-full p-1 text-[11px] font-semibold rounded border ${
                                    currentVal === '0800-1648' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                    currentVal === '1000-1848' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                                    currentVal === '1300-2148' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                    currentVal === 'AN' ? 'bg-purple-50 text-purple-800 border-purple-300' :
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
                          
                          {/* 月總工時與合規狀態欄 */}
                          <td className="p-3 text-center sticky right-0 bg-white z-10 border-l shadow-sm">
                            <div className={`px-2 py-1 rounded-md font-bold text-xs ${
                              isExact ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              isShort ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              {totalHrs.toFixed(1)} hrs
                              <span className="block text-[10px] font-normal mt-0.5">
                                {isExact ? '✓ 剛好達標' : isShort ? `缺 ${(176 - totalHrs).toFixed(1)}h` : `OT +${(totalHrs - 176).toFixed(1)}h`}
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
              <BarChart3 className="w-5 h-5 text-emerald-600" /> 版面 3：全月 Request 統計與透明度
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
                    const totalHrs = calculateTotalHours(staff);
                    return (
                      <tr key={staff} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">{staff}</td>
                        <td className="p-3 text-center font-medium text-slate-700">{count} 次</td>
                        <td className="p-3 text-center font-bold text-emerald-700">{totalHrs.toFixed(1)} 小時</td>
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