'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Users, Clock, AlertTriangle, Send, CheckCircle2, 
  Shield, BarChart3, Edit3, Lock, Unlock, LogOut, Eye, Download, 
  CheckCircle, Trash2, LockKeyhole, ChevronDown, Sparkles 
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

const ONLY_A_NO_COUNT_STAFF = [
  'Lo Hiu Yu',
  'Wong Hei Laam, Hazel'
];

const PREFER_A_STAFF = [
  'Tong Yiu Bun',
  'Leung Ka Ki'
];

const DUTY_PATTERNS = [
  { id: '0800-1648', label: '0800-1648 (A)', mins: 528, hours: 8.8, desc: '平日>=6人, 假期/週末3人' },
  { id: '1000-1848', label: '1000-1848 (10點)', mins: 528, hours: 8.8, desc: '每日限 1 人' },
  { id: '1300-2148', label: '1300-2148 (P)', mins: 528, hours: 8.8, desc: '平日2人, 假期/週末1人' },
  { id: 'AN', label: 'AN (ANight)', mins: 966, hours: 16.1, desc: '每日限 1 人 (翌日必跟R)' },
  { id: 'R', label: 'R (REST)', mins: 0, hours: 0, desc: 'AN翌日休息 (不計時數)' },
  { id: 'AL', label: 'AL (年假)', mins: 528, hours: 8.8, desc: '年假' },
  { id: 'CL', label: 'CL (恩恤假)', mins: 528, hours: 8.8, desc: '恩恤假' },
  { id: 'ML', label: 'ML (產假)', mins: 528, hours: 8.8, desc: '產假' },
  { id: '育嬰假', label: '育嬰假', mins: 528, hours: 8.8, desc: '育嬰假' },
  { id: 'DO', label: 'DO (Day Off)', mins: 0, hours: 0, desc: 'Day Off' },
  { id: 'O', label: 'O (休假)', mins: 0, hours: 0, desc: '休假' },
];

export default function OtaDutyApp() {
  const [activeTab, setActiveTab] = useState<'board1' | 'preview' | 'board2' | 'board3'>('board1');
  const [rangeStartDate, setRangeStartDate] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);

  // 🤖 按星期浮動豁免名單狀態 (Week 1, Week 2, Week 3, Week 4)
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [activeWeekTab, setActiveWeekTab] = useState<1 | 2 | 3 | 4>(1);
  const [weeklyExcludedStaff, setWeeklyExcludedStaff] = useState<Record<1 | 2 | 3 | 4, string[]>>({
    1: ['Ng Wai Hung Samuel', 'Lam Ngan Sze Jessie'],
    2: [],
    3: [],
    4: []
  });

  const [defaultConfig, setDefaultConfig] = useState({
    targetYear: 2026,
    targetMonthNum: 11,
    isLocked: false,
    monthStr: '2026-11'
  });

  const [viewMonthStr, setViewMonthStr] = useState('2026-11');
  const [historyMonthOptions, setHistoryMonthOptions] = useState<{ label: string; value: string }[]>([]);

  // 永續香港公眾假期對照表 (自動覆蓋 2026 至 2028 年，免手動更改)
  const publicHolidays: Record<string, string> = {
    // 2026 年
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

    // 2027 年 (自動支援，無需每年修改)
    '2027-01-01': '元旦',
    '2027-02-06': '農曆年初一',
    '2027-02-08': '農曆年初三',
    '2027-02-09': '農曆年初四 (補假)',
    '2027-03-26': '耶穌受難節',
    '2027-03-27': '耶穌受難節翌日',
    '2027-03-29': '復活節星期一',
    '2027-04-05': '清明節',
    '2027-05-01': '勞動節',
    '2027-05-13': '佛誕',
    '2027-06-09': '端午節',
    '2027-07-01': '香港特別行政區成立紀念日',
    '2027-09-16': '中秋節翌日',
    '2027-10-01': '國慶日',
    '2027-10-08': '重陽節',
    '2027-12-25': '聖誕節',
    '2027-12-27': '聖誕節後第一個周日結連',

    // 2028 年
    '2028-01-03': '元旦翌日 (補假)',
    '2028-01-26': '農曆年初一',
    '2028-01-27': '農曆年初二',
    '2028-01-28': '農曆年初三',
    '2028-04-14': '耶穌受難節',
    '2028-04-15': '耶穌受難節翌日',
    '2028-04-17': '復活節星期一',
    '2028-04-04': '清明節',
    '2028-05-01': '勞動節',
    '2028-05-02': '佛誕翌日',
    '2028-05-29': '端午節',
    '2028-07-01': '香港特別行政區成立紀念日',
    '2028-10-02': '國慶日翌日',
    '2028-10-06': '重陽節',
    '2028-12-25': '聖誕節',
    '2028-12-26': '聖誕節後第一個周日'
  };

  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); 
    const currentDate = today.getDate();

    // 自動預設為下一個月 (例如現在 10月，會自動開 11月)
    const targetDateObj = new Date(currentYear, currentMonth + 1, 1);
    const targetYear = targetDateObj.getFullYear();
    const targetMonthNum = targetDateObj.getMonth() + 1;

    const isLocked = currentDate > 22;
    const monthStr = `${targetYear}-${targetMonthNum < 10 ? '0' + targetMonthNum : targetMonthNum}`;

    setDefaultConfig({ targetYear, targetMonthNum, isLocked, monthStr });
    setViewMonthStr(monthStr);
    setSelectedDate(`${monthStr}-01`);

    // 動態產生過去 2 個月至未來 18 個月嘅下拉選單（自動跨年份，包括 2027, 2028...）
    const options = [];
    for (let i = -2; i < 18; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const str = `${y}-${m < 10 ? '0' + m : m}`;
      options.push({ label: `${y} 年 ${m} 月`, value: str });
    }
    setHistoryMonthOptions(options);
  }, []);

  const activeMonthConfig = useMemo(() => {
    const [y, m] = viewMonthStr.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return { year: y, monthNum: m, daysInMonth, daysArray, monthStr: viewMonthStr };
  }, [viewMonthStr]);

  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDate, setSelectedDate] = useState(`${defaultConfig.monthStr}-01`);
  const [selectedPattern, setSelectedPattern] = useState(DUTY_PATTERNS[0].id);
  
  const [requests, setRequests] = useState<{
    duty_pattern: string; staff_name: string; request_date: string; pattern: string 
  }[]>([]);
  const [matrixShifts, setMatrixShifts] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  const checkIsHolidayOrWeekend = (dateStr: string) => {
    if (!dateStr) return false;
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay(); 
    return Boolean(publicHolidays[dateStr] || dayOfWeek === 0 || dayOfWeek === 6);
  };

  const getWeekDayName = (dateStr: string) => {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const d = new Date(dateStr);
    return days[d.getDay()];
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

  useEffect(() => {
    const savedStaff = localStorage.getItem('ota_duty_user_name');
    if (savedStaff && STAFF_LIST.includes(savedStaff)) {
      setSelectedStaff(savedStaff);
    }
  }, []);

  const getPrevDateStr = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getNextDateStr = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const isAutoR = (staff: string, dateStr: string) => {
    const prevDateStr = getPrevDateStr(dateStr);
    const prevReq = requests.find(r => r.staff_name === staff && r.request_date === prevDateStr);
    const prevMatrix = matrixShifts[`${staff}-${prevDateStr}`];
    return (prevReq?.pattern === 'AN' || prevMatrix === 'AN');
  };

  const checkReqViolation = (dateStr: string, pattern: string) => {
    const reqsOnDay = requests.filter(r => r.request_date === dateStr);
    const count = reqsOnDay.filter(r => r.pattern === pattern).length;
    const isHoliday = checkIsHolidayOrWeekend(dateStr);

    if (pattern === 'AN' && count > 1) return true;
    if (pattern === '1000-1848' && count > 1) return true;
    if (pattern === '1300-2148' || pattern === '1330-2218') {
      if (!isHoliday && count > 2) return true;
      if (isHoliday && count > 1) return true;
    }
    return false;
  };

  const getWeekNumByDay = (dayNum: number): 1 | 2 | 3 | 4 => {
    if (dayNum <= 7) return 1;
    if (dayNum <= 14) return 2;
    if (dayNum <= 21) return 3;
    return 4;
  };

  const executeSmartAutoSchedule = async () => {
    setShowAutoModal(false);
    setIsAutoScheduling(true);

    let newMatrix = { ...matrixShifts };
    let upsertBatch: { staff_name: string; duty_date: string; pattern: string }[] = [];

    requests.forEach(r => {
      const dayNum = parseInt(r.request_date.split('-')[2], 10);
      const wNum = getWeekNumByDay(dayNum);
      if (weeklyExcludedStaff[wNum].includes(r.staff_name)) return;

      newMatrix[`${r.staff_name}-${r.request_date}`] = r.pattern;
      upsertBatch.push({ staff_name: r.staff_name, duty_date: r.request_date, pattern: r.pattern });
      if (r.pattern === 'AN') {
        const nextD = getNextDateStr(r.request_date);
        if (nextD <= `${activeMonthConfig.monthStr}-${activeMonthConfig.daysInMonth}`) {
          const nextDayNum = parseInt(nextD.split('-')[2], 10);
          const nextWNum = getWeekNumByDay(nextDayNum);
          if (!weeklyExcludedStaff[nextWNum].includes(r.staff_name)) {
            newMatrix[`${r.staff_name}-${nextD}`] = 'R';
            upsertBatch.push({ staff_name: r.staff_name, duty_date: nextD, pattern: 'R' });
          }
        }
      }
    });

    const weeks: Record<1 | 2 | 3 | 4, number[]> = { 1: [], 2: [], 3: [], 4: [] };
    activeMonthConfig.daysArray.forEach(day => {
      const wNum = getWeekNumByDay(day);
      weeks[wNum].push(day);
    });

    ([1, 2, 3, 4] as (1 | 2 | 3 | 4)[]).forEach(wNum => {
      const weekDays = weeks[wNum];
      const excludedInWeek = weeklyExcludedStaff[wNum];
      const activeStaffInWeek = STAFF_LIST.filter(s => !excludedInWeek.includes(s));

      activeStaffInWeek.forEach(staff => {
        const hasOInWeek = weekDays.some(day => {
          const dStr = `${activeMonthConfig.monthStr}-${String(day).padStart(2, '0')}`;
          const p = newMatrix[`${staff}-${dStr}`];
          return p === 'O' || p === 'DO';
        });

        if (!hasOInWeek) {
          for (const day of weekDays) {
            const dStr = `${activeMonthConfig.monthStr}-${String(day).padStart(2, '0')}`;
            if (!newMatrix[`${staff}-${dStr}`] && !isAutoR(staff, dStr)) {
              newMatrix[`${staff}-${dStr}`] = 'O';
              upsertBatch.push({ staff_name: staff, duty_date: dStr, pattern: 'O' });
              break;
            }
          }
        }
      });
    });

    activeMonthConfig.daysArray.forEach(day => {
      const dateStr = `${activeMonthConfig.monthStr}-${String(day).padStart(2, '0')}`;
      const wNum = getWeekNumByDay(day);
      const excludedInWeek = weeklyExcludedStaff[wNum];
      const activeValidStaff = STAFF_LIST.filter(s => !excludedInWeek.includes(s));

      const isHoliday = checkIsHolidayOrWeekend(dateStr);
      const minA = isHoliday ? 3 : 6;
      const targetP = isHoliday ? 1 : 2;

      let currentA = activeValidStaff.filter(s => 
        !ONLY_A_NO_COUNT_STAFF.includes(s) && newMatrix[`${s}-${dateStr}`] === '0800-1648'
      ).length;

      let currentP = activeValidStaff.filter(s => ['1300-2148', '1330-2218'].includes(newMatrix[`${s}-${dateStr}`])).length;
      let currentAN = activeValidStaff.filter(s => newMatrix[`${s}-${dateStr}`] === 'AN').length;
      let current10 = activeValidStaff.filter(s => newMatrix[`${s}-${dateStr}`] === '1000-1848').length;

      activeValidStaff.forEach((staff, sIdx) => {
        const key = `${staff}-${dateStr}`;
        if (!newMatrix[key]) {
          if (isAutoR(staff, dateStr)) {
            newMatrix[key] = 'R';
            upsertBatch.push({ staff_name: staff, duty_date: dateStr, pattern: 'R' });
            return;
          }

          if (ONLY_A_NO_COUNT_STAFF.includes(staff) || PREFER_A_STAFF.includes(staff)) {
            newMatrix[key] = '0800-1648';
            if (!ONLY_A_NO_COUNT_STAFF.includes(staff)) currentA++;
          }
          else if (current10 < 1 && (sIdx + day) % 23 === 3) {
            newMatrix[key] = '1000-1848';
            current10++;
          }
          else if (currentAN < 1 && (sIdx + day) % 23 === 7) {
            newMatrix[key] = 'AN';
            currentAN++;
            const nextD = getNextDateStr(dateStr);
            if (nextD <= `${activeMonthConfig.monthStr}-${activeMonthConfig.daysInMonth}`) {
              const nextDayNum = parseInt(nextD.split('-')[2], 10);
              const nextWNum = getWeekNumByDay(nextDayNum);
              if (!weeklyExcludedStaff[nextWNum].includes(staff)) {
                newMatrix[`${staff}-${nextD}`] = 'R';
                upsertBatch.push({ staff_name: staff, duty_date: nextD, pattern: 'R' });
              }
            }
          }
          else if (currentP < targetP) {
            newMatrix[key] = '1300-2148';
            currentP++;
          }
          else if (currentA < minA) {
            newMatrix[key] = '0800-1648';
            currentA++;
          }
          else {
            newMatrix[key] = 'O';
          }
          upsertBatch.push({ staff_name: staff, duty_date: dateStr, pattern: newMatrix[key] });
        }
      });
    });

    STAFF_LIST.forEach(staff => {
      let doCount = activeMonthConfig.daysArray.filter(day => {
        const dStr = `${activeMonthConfig.monthStr}-${String(day).padStart(2, '0')}`;
        return newMatrix[`${staff}-${dStr}`] === 'DO';
      }).length;

      if (doCount < 4) {
        for (const day of activeMonthConfig.daysArray) {
          if (doCount >= 4) break;
          const dStr = `${activeMonthConfig.monthStr}-${String(day).padStart(2, '0')}`;
          const wNum = getWeekNumByDay(day);
          if (weeklyExcludedStaff[wNum].includes(staff)) continue;

          const current = newMatrix[`${staff}-${dStr}`];
          if ((current === 'O' || !current) && !isAutoR(staff, dStr)) {
            newMatrix[`${staff}-${dStr}`] = 'DO';
            upsertBatch.push({ staff_name: staff, duty_date: dStr, pattern: 'DO' });
            doCount++;
          }
        }
      }
    });

    const { error } = await supabase.from('duty_schedules').upsert(upsertBatch, { onConflict: 'staff_name,duty_date' });
    if (error) {
      alert('自動排更儲存失敗: ' + error.message);
    } else {
      setMatrixShifts(newMatrix);
      setSuccessMsg('✨ 成功完成按星期浮動豁免的一鍵自動排更！');
      fetchData();
    }
    setIsAutoScheduling(false);
  };

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

    for (const dStr of selectedDates) {
      if (isAutoR(selectedStaff, dStr)) {
        setWarningMsg(`⚠️ ${dStr} 為 AN 班翌日休息 (R)，無法進行修改或提交！`);
        return;
      }
    }

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

    for (const dStr of selectedDates) {
      await supabase.from('duty_schedules').upsert([
        { staff_name: selectedStaff, duty_date: dStr, pattern: selectedPattern }
      ], { onConflict: 'staff_name,duty_date' });

      if (selectedPattern === 'AN') {
        const nextDateStr = getNextDateStr(dStr);
        if (nextDateStr <= `${activeMonthConfig.monthStr}-${activeMonthConfig.daysInMonth}`) {
          await supabase.from('duty_schedules').upsert([
            { staff_name: selectedStaff, duty_date: nextDateStr, pattern: 'R' }
          ], { onConflict: 'staff_name,duty_date' });
        }
      }
    }

    setSuccessMsg(`✅ 成功提交更期申請！`);
    fetchData();
  };

  const handleMatrixChange = async (staff: string, day: number, newPattern: string) => {
    const dateStr = `${activeMonthConfig.monthStr}-${day < 10 ? '0' + day : day}`;
    
    if (isAutoR(staff, dateStr)) {
      alert(`⚠️ 此更次為 AN 翌日之 Rest (R)，不能單獨修改！請先取消前一日的 AN 班。`);
      return;
    }

    setMatrixShifts(prev => ({ ...prev, [`${staff}-${dateStr}`]: newPattern }));

    await supabase.from('duty_schedules').upsert([
      { staff_name: staff, duty_date: dateStr, pattern: newPattern }
    ], { onConflict: 'staff_name,duty_date' });

    if (newPattern === 'AN') {
      const nextDateStr = getNextDateStr(dateStr);
      if (nextDateStr <= `${activeMonthConfig.monthStr}-${activeMonthConfig.daysInMonth}`) {
        setMatrixShifts(prev => ({ ...prev, [`${staff}-${nextDateStr}`]: 'R' }));
        await supabase.from('duty_schedules').upsert([
          { staff_name: staff, duty_date: nextDateStr, pattern: 'R' }
        ], { onConflict: 'staff_name,duty_date' });
      }
    }
  };

  const calculateTotalMinutes = (staff: string) => {
    let totalMins = 0;
    activeMonthConfig.daysArray.forEach(day => {
      const dateStr = `${activeMonthConfig.monthStr}-${day < 10 ? '0' + day : day}`;
      let patternId = matrixShifts[`${staff}-${dateStr}`] || 'O';
      if (isAutoR(staff, dateStr)) patternId = 'R';
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
      let curP = matrixShifts[`${staff}-${dateStr}`] || 'O';
      if (isAutoR(staff, dateStr)) curP = 'R';
      if (curP === patternId) count++;
    });
    return count;
  };

  const getEffectiveACount = (dateStr: string) => {
    let count = 0;
    STAFF_LIST.forEach(staff => {
      if (ONLY_A_NO_COUNT_STAFF.includes(staff)) return; 
      let curP = matrixShifts[`${staff}-${dateStr}`] || 'O';
      if (curP === '0800-1648') count++;
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
        let pattern = matrixShifts[`${staff}-${dateStr}`] || 'O';
        if (isAutoR(staff, dateStr)) pattern = 'R';
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

      {/* 🤖 按星期浮動豁免名單挑選彈窗 */}
      {showAutoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" /> 按星期設定不需出 Duty 嘅浮動同事 (DSC豁免)
              </h3>
              <button onClick={() => setShowAutoModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
              {([1, 2, 3, 4] as (1 | 2 | 3 | 4)[]).map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setActiveWeekTab(w)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    activeWeekTab === w ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  第 {w} 週 {w === 1 ? '(1-7日)' : w === 2 ? '(8-14日)' : w === 3 ? '(15-21日)' : '(22-尾)'}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              請勾選【第 {activeWeekTab} 週】不需要系統分配更次嘅同事：
            </p>

            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 p-3 rounded-lg bg-slate-50">
              {STAFF_LIST.map(staff => {
                const currentWeekList = weeklyExcludedStaff[activeWeekTab];
                const isChecked = currentWeekList.includes(staff);
                return (
                  <label key={staff} className="flex items-center justify-between p-2 rounded bg-white border border-slate-100 hover:bg-slate-100 cursor-pointer text-xs font-semibold">
                    <span>{staff}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        let updated = [...currentWeekList];
                        if (e.target.checked) {
                          updated.push(staff);
                        } else {
                          updated = updated.filter(s => s !== staff);
                        }
                        setWeeklyExcludedStaff({
                          ...weeklyExcludedStaff,
                          [activeWeekTab]: updated
                        });
                      }}
                      className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowAutoModal(false)} className="px-4 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-100">取消</button>
              <button type="button" onClick={executeSmartAutoSchedule} className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm">
                確認並開始一鍵自動排更 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[99%] mx-auto py-4">
        
        {activeTab === 'board1' && (
          <div className="max-w-6xl mx-auto space-y-4">
            
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

                <div>
                  <label className="block font-semibold text-slate-700 text-mb-1.5 text-xs">選擇 Duty Pattern (選 AN 翌日會自動顯示 R)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DUTY_PATTERNS.filter(p => p.id !== 'R').map(p => (
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

                {isCalendarOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-4">
                      
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
                          <div className="font-bold text-slate-600 mb-1">
                            {dateStr} {publicHolidays[dateStr] ? `🎉 (${publicHolidays[dateStr]})` : ''}
                          </div>
                          {dayReqs.length === 0 ? (
                            <div className="text-slate-400 italic text-[11px]">目前暫無人申請</div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {dayReqs.map((req, idx) => {
                                const isViolation = checkReqViolation(dateStr, req.pattern);

                                return (
                                  <span 
                                    key={idx} 
                                    className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                                      isViolation
                                        ? 'bg-rose-50 text-rose-900 border-rose-300 shadow-xs'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    }`}
                                  >
                                    <span className="font-bold">{req.staff_name}</span>
                                    <span className={`px-1 rounded text-[10px] font-bold ${
                                      isViolation ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                                    }`}>
                                      {req.pattern}
                                    </span>
                                    {isViolation && (
                                      <span className="font-bold text-rose-600 text-xs animate-pulse" title="該更次人數不符規矩！">
                                        ⚠️
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
 
                <div className="mt-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      📊 {activeMonthConfig.monthNum}月份 OTA Request 簡化版 Excel 實況表
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        每5秒自動更新
                      </span>
                      <button
                        onClick={() => fetchData()}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors active:scale-95"
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
                            const dateStr = `${activeMonthConfig.monthStr}-${formattedDay}`;
                            const weekDay = getWeekDayName(dateStr);
                            const isHoliday = checkIsHolidayOrWeekend(dateStr);
                            return (
                              <th key={dayNum} className={`p-1.5 border-r border-slate-200 font-medium whitespace-nowrap min-w-[45px] ${isHoliday ? 'bg-rose-100 text-rose-800' : ''}`} title={publicHolidays[dateStr] || ''}>
                                <div>{formattedDay}</div>
                                <div className="text-[9px] opacity-80">({weekDay})</div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {STAFF_LIST.map((staffName) => (
                          <tr key={staffName} className="hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 font-bold bg-slate-50 sticky left-0 z-10 text-slate-700 text-left">
                              {staffName}
                            </td>

                            {activeMonthConfig.daysArray.map((dayNum) => {
                              const formattedDay = String(dayNum).padStart(2, '0');
                              const dateStr = `${activeMonthConfig.monthStr}-${formattedDay}`;

                              const matchedReq = requests.find(
                                (r) => r.request_date === dateStr && r.staff_name === staffName
                              );

                              const hasAutoR = isAutoR(staffName, dateStr);

                              return (
                                <td key={dateStr} className="p-1.5 border-r border-slate-100">
                                  {matchedReq ? (
                                    <span className="inline-block px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px] border border-emerald-300 shadow-xs">
                                      {matchedReq.pattern}
                                    </span>
                                  ) : hasAutoR ? (
                                    <span className="inline-block px-1 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[9px] border border-indigo-300 shadow-xs">
                                      R
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
                              
                              if (req.pattern === 'AN') {
                                const nextDateStr = getNextDateStr(req.request_date);
                                await supabase.from('staff_requests').delete().eq('staff_name', req.staff_name).eq('request_date', nextDateStr);
                                await supabase.from('duty_schedules').upsert([{ staff_name: req.staff_name, duty_date: nextDateStr, pattern: 'O' }], { onConflict: 'staff_name,duty_date' });
                              }

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
                <p className="text-[11px] text-slate-500 mt-0.5">A班規則：平日有效人手最少6人，週末/假期3人。P班：平日2人，假期1人。</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b">
                      <th className="p-2 font-bold min-w-[130px] max-w-[130px] sticky left-0 bg-slate-100 z-10 border-r shadow-sm truncate">員工姓名</th>
                      {activeMonthConfig.daysArray.map(day => {
                        const dateStr = `${activeMonthConfig.monthStr}-${String(day).padStart(2, '0')}`;
                        const weekDay = getWeekDayName(dateStr);
                        const isHoliday = checkIsHolidayOrWeekend(dateStr);
                        return (
                          <th key={day} className={`p-1.5 text-center min-w-[65px] max-w-[65px] border-l font-semibold ${isHoliday ? 'bg-rose-100 text-rose-800' : ''}`} title={publicHolidays[dateStr] || ''}>
                            <div>{activeMonthConfig.monthNum}/{day}</div>
                            <div className="text-[9px] opacity-80">({weekDay})</div>
                          </th>
                        );
                      })}
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
                            const isHoliday = checkIsHolidayOrWeekend(dateStr);
                            let currentVal = matrixShifts[`${staff}-${dateStr}`] || 'O';
                            if (isAutoR(staff, dateStr)) currentVal = 'R';

                            const hasRequested = isRequestedByStaff(staff, dateStr, currentVal);

                            const isAnOver = currentVal === 'AN' && getDayPatternCount(dateStr, 'AN') > 1;
                            const isMidOver = currentVal === '1000-1848' && getDayPatternCount(dateStr, '1000-1848') > 1;
                            
                            const pCount = getDayPatternCount(dateStr, '1300-2148') + getDayPatternCount(dateStr, '1330-2218');
                            const effectiveACount = getEffectiveACount(dateStr);

                            const isPOver = (currentVal === '1300-2148' || currentVal === '1330-2218') && ((!isHoliday && pCount !== 2) || (isHoliday && pCount !== 1));
                            const isALack = currentVal === '0800-1648' && !ONLY_A_NO_COUNT_STAFF.includes(staff) && ((!isHoliday && effectiveACount < 6) || (isHoliday && effectiveACount < 3));

                            const hasWarning = isAnOver || isMidOver || isPOver || isALack;

                            return (
                              <td key={day} className={`p-0.5 border-l text-center ${hasWarning ? 'bg-rose-50' : isHoliday ? 'bg-rose-50/40' : ''}`}>
                                <div className={`p-1 text-[10px] font-semibold rounded truncate ${
                                  currentVal === '0800-1648' ? 'bg-emerald-50 text-emerald-800' :
                                  currentVal === '1000-1848' ? 'bg-blue-50 text-blue-800' :
                                  (currentVal === '1300-2148' || currentVal === '1330-2218') ? 'bg-amber-50 text-amber-800' :
                                  currentVal === 'AN' ? 'bg-purple-50 text-purple-800' :
                                  currentVal === 'R' ? 'bg-indigo-50 text-indigo-800 font-bold' :
                                  ['AL', 'CL', 'ML', '育嬰假', 'O'].includes(currentVal) ? 'bg-teal-50 text-teal-800' :
                                  'bg-slate-50 text-slate-400'
                                }`}>
                                  {currentVal}{hasRequested ? '^' : ''}
                                  {hasWarning && <span className="block text-[8px] text-rose-600 font-bold">⚠️人手</span>}
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

        {/* 版面 3：主管 Excel 全月矩陣 */}
        {activeTab === 'board2' && isAdmin && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-emerald-600" /> 主管全月總覽與一鍵自動排更
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">跨年公眾假期已自動識別，並支援無限向後選取未來年份。</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <button
                  onClick={() => setShowAutoModal(true)}
                  disabled={isAutoScheduling}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all shrink-0 active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
                  {isAutoScheduling ? 'AI 排更中...' : '🤖 一鍵公平自動排更'}
                </button>

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
                      {activeMonthConfig.daysArray.map(day => {
                        const dateStr = `${activeMonthConfig.monthStr}-${String(day).padStart(2, '0')}`;
                        const weekDay = getWeekDayName(dateStr);
                        const isHoliday = checkIsHolidayOrWeekend(dateStr);
                        return (
                          <th key={day} className={`p-1.5 text-center min-w-[70px] max-w-[70px] border-l font-semibold ${isHoliday ? 'bg-rose-100 text-rose-800' : ''}`} title={publicHolidays[dateStr] || ''}>
                            <div>{activeMonthConfig.monthNum}/{day}</div>
                            <div className="text-[9px] opacity-80">({weekDay})</div>
                          </th>
                        );
                      })}
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
                            const isHoliday = checkIsHolidayOrWeekend(dateStr);
                            let currentVal = matrixShifts[`${staff}-${dateStr}`] || 'O';
                            const hasAutoR = isAutoR(staff, dateStr);
                            if (hasAutoR) currentVal = 'R';

                            const hasRequested = isRequestedByStaff(staff, dateStr, currentVal);

                            return (
                              <td key={day} className={`p-0.5 border-l text-center ${isHoliday ? 'bg-rose-50/50' : ''}`}>
                                <div className="flex items-center gap-0.5">
                                  <select
                                    value={currentVal}
                                    disabled={hasAutoR}
                                    onChange={(e) => handleMatrixChange(staff, day, e.target.value)}
                                    className={`w-full p-1 text-[10px] font-semibold rounded border ${
                                      hasAutoR ? 'bg-indigo-100 text-indigo-900 border-indigo-300 opacity-90 cursor-not-allowed font-bold' :
                                      currentVal === '0800-1648' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                      currentVal === '1000-1848' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                                      (currentVal === '1300-2148' || currentVal === '1330-2218') ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                      currentVal === 'AN' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                                      ['AL', 'CL', 'ML', '育嬰假', 'O'].includes(currentVal) ? 'bg-teal-50 text-teal-800 border-teal-300' :
                                      'bg-slate-50 text-slate-400 border-slate-200'
                                    }`}
                                    title={hasAutoR ? "前一日為 AN 班，此 REST 班次無法單獨修改" : ""}
                                  >
                                    {DUTY_PATTERNS.map(p => (
                                      <option key={p.id} value={p.id}>{p.id}</option>
                                    ))}
                                  </select>
                                  {hasRequested && <span className="text-emerald-600 font-bold text-[10px]">^</span>}
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

        {/* 版面 4：公平分派統計 */}
        {activeTab === 'board3' && isAdmin && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" /> 公平分派統計 (AN、R 及 P 班總次數)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">實時統計每位同事於選定月份的 Request、AN、R 及 P 班總次數。</p>
              </div>

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
                    <th className="p-2.5 text-center font-semibold text-indigo-700">R 總次數</th>
                    <th className="p-2.5 text-center font-semibold text-amber-700">P 總次數</th>
                    <th className="p-2.5 text-center font-semibold">全月已申請總工時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {STAFF_LIST.map((staff: string) => {
                    const reqCount = requests.filter(r => r.staff_name === staff).length;
                    let anCount = 0;
                    let rCount = 0;
                    let pCount = 0;

                    activeMonthConfig.daysArray.map(day => {
                      const dateStr = `${activeMonthConfig.monthStr}-${day < 10 ? '0' + day : day}`;
                      let pattern = matrixShifts[`${staff}-${dateStr}`];
                      if (isAutoR(staff, dateStr)) pattern = 'R';

                      if (pattern === 'AN') anCount++;
                      if (pattern === 'R') rCount++;
                      if (pattern === '1300-2148' || pattern === '1330-2218') pCount++;
                    });

                    const totalMins = calculateTotalMinutes(staff);

                    return (
                      <tr key={staff} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-900">{staff}</td>
                        <td className="p-2.5 text-center font-medium text-slate-700">{reqCount} 次</td>
                        <td className="p-2.5 text-center font-bold text-purple-700 bg-purple-50/50">{anCount} 次</td>
                        <td className="p-2.5 text-center font-bold text-indigo-700 bg-indigo-50/50">{rCount} 次</td>
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