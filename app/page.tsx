'use client';

import { useState, useEffect } from 'react';
import { Calendar, Users, Clock, AlertTriangle, Send, CheckCircle2, Shield, BarChart3, Edit3, Lock, Unlock, LogOut, Eye } from 'lucide-react';
import { supabase } from './lib/supabase';

// 已更新為 Excel 的完整 23 位同事名單
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
  'Lam Yan Ling Emma ',
  'Zhang Shenjun',
  'Leung Ka Ki',
  'Lo Hiu Yu ',
  'Wong Hei Laam, Hazel '
];

const DUTY_PATTERNS = [
  { id: '0800-1648', label: '0800-1648 (A)', hours: 8.8, desc: '平日>=6人, 假期/週末3人' },
  { id: '1000-1848', label: '1000-1848 (10)', hours: 8.8, desc: '每日限 1 人' },
  { id: '1330-2218', label: '1330-2218 (P)', hours: 8.8, desc: '平日2人, 假期/週末1人' },
  { id: 'AN', label: 'AN (AN)', hours: 16.1, desc: '每日限 1 人' },
  { id: 'OFF', label: 'OFF (休假)', hours: 0, desc: '休假' },
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

  const calculateTotalHours = (staff: string) => {
    let total = 0;
    daysInMonth.forEach(day => {
      const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
      const patternId = matrixShifts[`${staff}-${dateStr}`] || 'OFF';
      const patternObj = DUTY_PATTERNS.find(p => p.id === patternId);
      if (patternObj) total += patternObj.hours;
    });
    return Math.round(total * 10) / 10;
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
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button onClick={() => setActiveTab('board1')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'board1' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>
                📝 申請更次
              </button>
              <button onClick={() => setActiveTab('preview')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'preview' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>
                👀 預計更表 (防撞期)
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => setActiveTab('board2')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'board2' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>
                    📊 主管總覽與工時
                  </button>
                  <button onClick={() => setActiveTab('board3')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'board3' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>
                    📈 統計與透明度
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

      {/* 內容區塊 */}
      <div className="max-w-[98%] mx-auto py-6">
        
        {/* 版面 1：同事意願申請 */}
        {activeTab === 'board1' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> 同事更次意願請求 (Staff Request)
            </h2>
            <form onSubmit={handleSubmitRequest} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">選擇您的姓名 ({STAFF_LIST.length} 位同事)</label>
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
                    <div key={p.id} onClick={() => setSelectedPattern(p.id)} className={`p-3 rounded