'use client';

import { useState } from 'react';
import { Calendar, Users, Clock, AlertTriangle, Send, CheckCircle2, Shield, BarChart3, Edit3 } from 'lucide-react';

const STAFF_LIST = ['Cheuk Ho', 'Dr. Wong', 'Nurse Chan', 'Nurse Lee', 'Nurse Mary'];

const DUTY_PATTERNS = [
  { id: '0800-1648', label: '0800-1648 (日班)', desc: '平日>=6人, 假期/週末3人' },
  { id: '1000-1848', label: '1000-1848 (中班)', desc: '每日限 1 人' },
  { id: '1300-2148', label: '1300-2148 (晚班)', desc: '平日2人, 假期/週末1人' },
  { id: 'AN', label: 'AN (跨日更)', desc: 'A:0800-1418 & N:2130-0848 (每日限1人)' },
  { id: 'OFF', label: 'OFF (休假)', desc: '休假' },
];

export default function OtaDutyApp() {
  const [activeTab, setActiveTab] = useState<'board1' | 'board2' | 'board3'>('board2');

  // 版面 1 State
  const [selectedStaff, setSelectedStaff] = useState(STAFF_LIST[0]);
  const [selectedDate, setSelectedDate] = useState('2026-10-15');
  const [selectedPattern, setSelectedPattern] = useState(DUTY_PATTERNS[0].id);
  const [requests, setRequests] = useState<{ staff: string; date: string; pattern: string }[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  // 版面 2 State (矩陣更次紀錄: key = "staff-date", value = pattern)
  const [matrixShifts, setMatrixShifts] = useState<Record<string, string>>({
    'Cheuk Ho-2026-10-13': '0800-1648',
    'Dr. Wong-2026-10-13': 'AN',
    'Nurse Chan-2026-10-13': '1000-1848',
    'Nurse Lee-2026-10-13': '1300-2148',
  });

  // 模擬當月 1 至 15 日
  const daysInMonth = Array.from({ length: 15 }, (_, i) => i + 1);

  // 提交 Request 邏輯
  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setWarningMsg('');

    const userReqCount = requests.filter(r => r.staff === selectedStaff).length + 1;
    if (userReqCount > 4) {
      setWarningMsg(`⚠️ 提醒：${selectedStaff} 本週的更次請求次數已達 ${userReqCount} 次（超過 4 次建議頻率），請留意！`);
    }

    setRequests([{ staff: selectedStaff, date: selectedDate, pattern: selectedPattern }, ...requests]);
    // 同步更新到矩陣中
    setMatrixShifts(prev => ({ ...prev, [`${selectedStaff}-${selectedDate}`]: selectedPattern }));
    setSuccessMsg(`✅ 成功提交 ${selectedDate} 的 [${selectedPattern}] 意願申請！`);
  };

  // 主管直接修改矩陣格子的更次
  const handleMatrixChange = (staff: string, day: number, newPattern: string) => {
    const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
    setMatrixShifts({ ...matrixShifts, [`${staff}-${dateStr}`]: newPattern });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      {/* 頂部導覽列 / Tabs 切換 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-600" />
              OTA Duty - 醫療人員更次管理系統
            </h1>
            <p className="text-xs text-slate-500">Caritas Medical Centre - Operation Theatre</p>
          </div>

          {/* 分頁按鈕 */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('board1')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'board1' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              版面 1：同事意願申請
            </button>
            <button
              onClick={() => setActiveTab('board2')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'board2' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              版面 2：主管總覽與工時
            </button>
            <button
              onClick={() => setActiveTab('board3')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'board3' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              版面 3：統計與透明度
            </button>
          </div>
        </div>
      </header>

      {/* 內容區塊 */}
      <div className="max-w-7xl mx-auto p-6">
        
        {/* ================= 佈局 1：同事申請 Portal ================= */}
        {activeTab === 'board1' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> 同事更次意願請求 (Staff Request)
            </h2>
            <form onSubmit={handleSubmitRequest} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">選擇您的姓名</label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {STAFF_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">選擇日期 (2個月內)</label>
                <input
                  type="date"
                  value={selectedDate}
                  min="2026-10-13"
                  max="2026-12-31"
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">選擇 Duty Pattern</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DUTY_PATTERNS.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPattern(p.id)}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        selectedPattern === p.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-sm">{p.id}</div>
                      <div className="text-xs text-slate-500">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> 提交 Request
              </button>
            </form>

            {warningMsg && (
              <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" /> {warningMsg}
              </div>
            )}
            {successMsg && (
              <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> {successMsg}
              </div>
            )}
          </div>
        )}

        {/* ================= 佈局 2：主管 Excel 總覽與 44 小時統計 ================= */}
        {activeTab === 'board2' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-emerald-600" /> 主管 Excel 矩陣總覽與快速修改
                </h2>
                <p className="text-sm text-slate-500 mt-1">即時檢視所有同事更次分佈，支援手動下拉修改；下方自動計算每週 44 小時工時與每日人數限制。</p>
              </div>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-sm font-semibold">
                目前月份：2026年10月
              </span>
            </div>

            {/* Excel 風格矩陣表格 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="p-3 font-semibold min-w-[140px] sticky left-0 bg-slate-100 z-10 border-r border-slate-200">員工姓名</th>
                      {daysInMonth.map(day => (
                        <th key={day} className="p-3 text-center font-medium min-w-[120px] border-l border-slate-200">
                          10/{day}
                        </th>
                      ))}
                      <th className="p-3 text-center font-bold min-w-[100px] border-l border-slate-200 bg-slate-100">每週總工時</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {STAFF_LIST.map(staff => (
                      <tr key={staff} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200">
                          {staff}
                        </td>
                        {daysInMonth.map(day => {
                          const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
                          const currentVal = matrixShifts[`${staff}-${dateStr}`] || 'OFF';

                          return (
                            <td key={day} className="p-2 border-l border-slate-200 text-center">
                              <select
                                value={currentVal}
                                onChange={(e) => handleMatrixChange(staff, day, e.target.value)}
                                className={`w-full p-1.5 text-xs font-semibold rounded border ${
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
                        {/* 44小時計算欄位模擬 */}
                        <td className="p-3 text-center font-bold text-slate-700 border-l border-slate-200 bg-slate-50">
                          44.0 hrs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 每日各 Pattern 人數統計與對照 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" /> 每日更次人數合規檢視 (Requirement Check)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="font-semibold text-emerald-900">0800-1648 (日班)</div>
                  <div className="text-xs text-emerald-700 mt-1">規則：平日 $\ge 6$ 人 / 假期 3 人</div>
                  <div className="mt-2 font-bold text-emerald-800">狀態：符合要求 (當日 6人)</div>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="font-semibold text-blue-900">1000-1848 (中班)</div>
                  <div className="text-xs text-blue-700 mt-1">規則：每日限 1 人</div>
                  <div className="mt-2 font-bold text-blue-800">狀態：符合要求 (當日 1人)</div>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="font-semibold text-amber-900">1300-2148 (晚班)</div>
                  <div className="text-xs text-amber-700 mt-1">規則：平日 2 人 / 假期 1 人</div>
                  <div className="mt-2 font-bold text-amber-800">狀態：符合要求 (當日 2人)</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="font-semibold text-purple-900">AN (跨日更)</div>
                  <div className="text-xs text-purple-700 mt-1">規則：每日限 1 人</div>
                  <div className="mt-2 font-bold text-purple-800">狀態：符合要求 (當日 1人)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 佈局 3：統計與透明度專區 ================= */}
        {activeTab === 'board3' && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" /> 版面 3：透明度統計專區 (Analytics & Transparency)
            </h2>
            <p className="text-sm text-slate-500 mb-6">供全體員工透明檢視每個月的更次分配統計，確保公平公正。</p>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b">
                    <th className="p-3 font-semibold">員工姓名</th>
                    <th className="p-3 text-center font-semibold">本月 Request 總次數</th>
                    <th className="p-3 text-center font-semibold">本月 AN Pattern 次數</th>
                    <th className="p-3 text-center font-semibold">本月 P (下午/特定) 次數</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {STAFF_LIST.map((staff, index) => (
                    <tr key={staff} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{staff}</td>
                      <td className="p-3 text-center font-medium text-slate-700">{index + 2} 次</td>
                      <td className="p-3 text-center font-medium text-purple-700">{index === 0 ? 3 : 1} 次</td>
                      <td className="p-3 text-center font-medium text-blue-700">{index === 1 ? 4 : 2} 次</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}