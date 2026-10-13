'use client';

import { useState } from 'react';
import { Calendar, User, Clock, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';

// 模擬員工名單
const STAFF_LIST = ['Cheuk Ho', 'Dr. Wong', 'Nurse Chan', 'Nurse Lee', 'Nurse Mary'];

// 規定的 Duty Patterns
const DUTY_PATTERNS = [
  { id: '0800-1648', label: '0800-1648 (日班 - 正常更次)', desc: '平日>=6人, 假期/週末3人' },
  { id: '1000-1848', label: '1000-1848 (中班)', desc: '每日限 1 人' },
  { id: '1300-2148', label: '1300-2148 (晚班)', desc: '平日2人, 假期/週末1人' },
  { id: 'AN', label: 'AN (橫越兩日更次)', desc: 'A:0800-1418 & N:2130-0848 (每日限1人)' },
];

export default function DutyRequestPage() {
  const [selectedStaff, setSelectedStaff] = useState(STAFF_LIST[0]);
  const [selectedDate, setSelectedDate] = useState('2026-10-15');
  const [selectedPattern, setSelectedPattern] = useState(DUTY_PATTERNS[0].id);
  
  // 模擬記錄每個同事每週的申請紀錄 (key: staff-weekIndex, value: request count)
  // 為了示範，我們可以用一個簡單的state儲存歷史申請列表
  const [requests, setRequests] = useState<{ staff: string; date: string; pattern: string }[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  // 計算該同事當週（或目前累積）的 Request 次數
  // 簡單以目前選擇的員工來計算總申請或當週次數
  const getWeeklyCount = (staff: string) => {
    return requests.filter(r => r.staff === staff).length + 1; // 加上當次即將提交的
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setWarningMsg('');

    const currentCount = getWeeklyCount(selectedStaff);

    // 檢查是否超過 4 次請求
    if (currentCount > 4) {
      setWarningMsg(`⚠️ 提醒：${selectedStaff} 本週的更次請求次數已達 ${currentCount} 次（超過 4 次建議頻率），請留意調整！`);
    }

    // 新增申請
    const newReq = { staff: selectedStaff, date: selectedDate, pattern: selectedPattern };
    setRequests([newReq, ...requests]);
    setSuccessMsg(`✅ 成功為 ${selectedStaff} 提交 ${selectedDate} 的 [${selectedPattern}] 意願申請！`);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="max-w-3xl mx-auto">
        
        {/* 頂部標題 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center justify-center gap-2">
            <Calendar className="w-7 h-7 text-emerald-600" />
            OTA Duty - 同事更次意願申請 (版面 1)
          </h1>
          <p className="text-sm text-slate-500 mt-1">Caritas Medical Centre - Operation Theatre Staff Portal</p>
        </div>

        {/* 申請表單卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <form onSubmit={handleSubmitRequest} className="space-y-6">
            
            {/* 1. 選擇同事姓名 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" /> 選擇您的姓名 (Staff Name)
              </label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-700 font-medium"
              >
                {STAFF_LIST.map(staff => (
                  <option key={staff} value={staff}>{staff}</option>
                ))}
              </select>
            </div>

            {/* 2. 選擇日期 (當月起計 2 個月內限制) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" /> 選擇申請日期 (當月及未來 2 個月內)
              </label>
              <input
                type="date"
                value={selectedDate}
                min="2026-10-13"
                max="2026-12-31"
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-700 font-medium"
              />
              <p className="text-xs text-slate-400 mt-1">系統限制：只可選取 2026年10月 至 2026年12月 內的日期。</p>
            </div>

            {/* 3. 選擇 Duty Pattern */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" /> 選擇 Duty Pattern 類型
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DUTY_PATTERNS.map(pattern => (
                  <div
                    key={pattern.id}
                    onClick={() => setSelectedPattern(pattern.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedPattern === pattern.id
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{pattern.id}</div>
                    <div className="text-xs text-slate-500 mt-1">{pattern.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 提交按鈕 */}
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg shadow transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> 提交更次意願請求 (Request Duty)
            </button>
          </form>

          {/* 提示與警告訊息區 */}
          {warningMsg && (
            <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{warningMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{successMsg}</div>
            </div>
          )}
        </div>

        {/* 近期提交紀錄 (預覽) */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">您本階段已提交的 Request 紀錄</h3>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-400">暫無提交紀錄。</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((req, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-700">{req.staff}</span>
                  <span className="text-slate-500">{req.date}</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md font-semibold text-slate-800">{req.pattern}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}