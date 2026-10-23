import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import html2pdf from 'html2pdf.js';
import {
  fetchSalariesApi,
  updateSalaryStatusApi,
  fetchBulkSalaryCandidatesApi,
  processBulkSalaryApi,
  retryFailedSalariesApi,
} from '../../../api/adminPayroll.api';
import {
  getSalaryDatesApi,
  createSalaryDateApi,
  updateSalaryDateApi,
} from '../../../api/adminMiscSetting.api';
import { fetchTeacherSalariesApi } from '../../../api/teacherPayroll.api';
import { numberToWords } from '../../../utils/numberToWords';
import { resolveImageUrl } from '../../../utils/url.util';
import { encodeParam } from '../../../utils/idHelper';
import schoolLogoDefault from '../../../assets/school-logo.png';
import TableActionMenu from '../../../components/common/TableActionMenu';
import NoData from '../../../components/common/NoData';

const SalaryManagement = () => {
  const authUser = useSelector((state) => state.auth?.user);
  const teacherUser = useSelector((state) => state.teacherAuth?.teacher || state.teacherAuth?.user);
  const isTeacher =
    window.location.pathname.startsWith('/teacher') ||
    (Boolean(teacherUser) && !window.location.pathname.startsWith('/admin'));
  const basePath = isTeacher ? '/teacher' : '/admin';
  const currentUser = isTeacher ? teacherUser : authUser;

  // Salary History state
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState(null);

  // Selection state in Salary Payment History Table
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  const [retrying, setRetrying] = useState(false);

  // Admin-configured salary payment date state (from settings_salary_date table)
  const [salaryDateSetting, setSalaryDateSetting] = useState(null);
  const [showSalaryDateModal, setShowSalaryDateModal] = useState(false);
  const [salaryDateForm, setSalaryDateForm] = useState({ salary_date: '', status: 1 });
  const [savingSalaryDate, setSavingSalaryDate] = useState(false);

  // Bulk Salary Payment Workspace state (Bulk-only mode: always active for Admin)
  const [bulkStep, setBulkStep] = useState('select'); // 'select' | 'review' | 'result'
  const [bulkMonth, setBulkMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [bulkPaymentDate, setBulkPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bulkUserType, setBulkUserType] = useState('');
  const [bulkEligibilityFilter, setBulkEligibilityFilter] = useState('all'); // 'all' | 'eligible' | 'ineligible' | 'paid'
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState(1);
  const [bulkTxPrefix, setBulkTxPrefix] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState([]); // Array of `${user_type}_${id}`
  const [customAdjustments, setCustomAdjustments] = useState({}); // { [key]: { basic_salary, additional_deductions, transaction_id, payment_status } }
  const [processingBulk, setProcessingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Helper to get normalized unique key for candidate
  const getCandidateKey = useCallback((c) => `${String(c.user_type)}_${String(c.id)}`, []);

  const resolveActiveBranchFilter = useCallback(() => {
    const isSuper =
      Boolean(currentUser?.isSuperAdmin) ||
      Number(currentUser?.admin_type ?? currentUser?.adminType) === 1;
    const userAssignedBranch = currentUser?.branch_id || currentUser?.branchId || null;
    if (!isSuper && userAssignedBranch) {
      return Number(userAssignedBranch);
    }
    const storedBranch =
      typeof window !== 'undefined' ? localStorage.getItem('active_branch_id') : null;
    if (storedBranch && storedBranch !== 'all') {
      return Number(storedBranch) || null;
    }
    return null;
  }, [currentUser]);

  const isEmployeeActive = useCallback((record) => {
    if (!record) return false;
    const empStatus =
      record.employee_status !== undefined && record.employee_status !== null
        ? record.employee_status
        : record.status;
    if (empStatus === undefined || empStatus === null) return true;
    const statusNum = Number(empStatus);
    return statusNum === 1 && statusNum !== 4 && statusNum !== 2 && statusNum !== 0;
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const activeBranch = resolveActiveBranchFilter();
      const params = activeBranch ? { branch_id: activeBranch } : {};
      const fetchFn = isTeacher ? fetchTeacherSalariesApi : fetchSalariesApi;
      const res = await fetchFn(params).catch(() => null);
      if (res?.data?.salary_date_setting) {
        setSalaryDateSetting(res.data.salary_date_setting);
      }
      let rawSalaries = [];
      if (Array.isArray(res?.data?.salaries)) {
        rawSalaries = res.data.salaries;
      } else if (Array.isArray(res?.salaries)) {
        rawSalaries = res.salaries;
      } else if (Array.isArray(res?.data)) {
        rawSalaries = res.data;
      }
      setSalaries(rawSalaries.filter(isEmployeeActive));
    } catch (err) {
      console.error('Error loading salaries:', err);
    } finally {
      setLoading(false);
    }
  }, [isTeacher, resolveActiveBranchFilter, isEmployeeActive]);

  const loadBulkCandidates = useCallback(
    async (monthOverride, typeOverride) => {
      if (isTeacher) return;
      const targetMonth = monthOverride !== undefined ? monthOverride : bulkMonth;
      const targetType = typeOverride !== undefined ? typeOverride : bulkUserType;
      const activeBranch = resolveActiveBranchFilter();
      try {
        setLoadingCandidates(true);
        const res = await fetchBulkSalaryCandidatesApi({
          salary_month: targetMonth,
          user_type: targetType || undefined,
          ...(activeBranch ? { branch_id: activeBranch } : {}),
        });
        const rawList = res?.data?.candidates || res?.candidates || [];
        const list = (Array.isArray(rawList) ? rawList : []).filter(isEmployeeActive);
        const setting = res?.data?.salary_date_setting || res?.salary_date_setting || null;
        const confDate = res?.data?.configured_salary_date || setting?.configured_salary_date || null;
        if (setting) {
          setSalaryDateSetting(setting);
        }
        if (confDate) {
          setBulkPaymentDate(confDate);
        }
        setCandidates(list);
        // Keep only selected keys that are still eligible & not already paid
        setSelectedCandidateKeys((prev) =>
          prev.filter((k) => {
            const found = list.find((c) => `${String(c.user_type)}_${String(c.id)}` === k);
            return found && found.is_beneficiary_verified && !found.is_already_paid;
          })
        );
      } catch (err) {
        console.error('Error loading bulk salary candidates:', err);
        toast.error(err?.response?.data?.message || 'Failed to load registered beneficiaries for salary payment.');
        setCandidates([]);
      } finally {
        setLoadingCandidates(false);
      }
    },
    [isTeacher, bulkMonth, bulkUserType, resolveActiveBranchFilter, isEmployeeActive]
  );

  useEffect(() => {
    loadData();
    const handleRefresh = () => {
      loadData();
      if (!isTeacher) {
        loadBulkCandidates();
      }
    };
    window.addEventListener('branch_changed', handleRefresh);
    window.addEventListener('salary_date_updated', handleRefresh);
    return () => {
      window.removeEventListener('branch_changed', handleRefresh);
      window.removeEventListener('salary_date_updated', handleRefresh);
    };
  }, [loadData, isTeacher, loadBulkCandidates]);

  useEffect(() => {
    if (!isTeacher) {
      loadBulkCandidates(bulkMonth, bulkUserType);
    }
  }, [bulkMonth, bulkUserType, isTeacher, loadBulkCandidates]);

  const handleOpenSalaryDateModal = async () => {
    try {
      const res = await getSalaryDatesApi({ limit: 5, salary_month: bulkMonth }).catch(() => null);
      const active = res?.data?.activeSalaryDate || salaryDateSetting;
      if (active) {
        setSalaryDateSetting(active);
        setSalaryDateForm({
          salary_date: active.configured_salary_date || active.salary_date || bulkPaymentDate,
          status: Number(active.status) === 2 ? 2 : 1,
        });
      } else {
        setSalaryDateForm({
          salary_date: bulkPaymentDate || new Date().toISOString().split('T')[0],
          status: 1,
        });
      }
    } catch {
      setSalaryDateForm({
        salary_date: salaryDateSetting?.configured_salary_date || bulkPaymentDate || new Date().toISOString().split('T')[0],
        status: 1,
      });
    }
    setShowSalaryDateModal(true);
  };

  const handleSaveSalaryDateSetting = async (e) => {
    e.preventDefault();
    if (!salaryDateForm.salary_date) {
      toast.warning('Please select a salary payment date.');
      return;
    }
    try {
      setSavingSalaryDate(true);
      let res;
      if (salaryDateSetting?.id) {
        res = await updateSalaryDateApi(salaryDateSetting.id, {
          salary_date: salaryDateForm.salary_date,
          status: Number(salaryDateForm.status) || 1,
        });
      } else {
        res = await createSalaryDateApi({
          salary_date: salaryDateForm.salary_date,
          status: Number(salaryDateForm.status) || 1,
        });
      }
      const updatedActive = res?.data?.activeSalaryDate || null;
      const newDate = res?.data?.configured_salary_date || salaryDateForm.salary_date;
      if (updatedActive) {
        setSalaryDateSetting(updatedActive);
      }
      setBulkPaymentDate(newDate);
      if (newDate && newDate.slice(0, 7) !== bulkMonth) {
        setBulkMonth(newDate.slice(0, 7));
      }
      setShowSalaryDateModal(false);
      toast.success('Salary payment date configured in settings_salary_date.');
      window.dispatchEvent(new Event('salary_date_updated'));
      await loadBulkCandidates(newDate ? newDate.slice(0, 7) : bulkMonth, bulkUserType);
    } catch (err) {
      console.error('Error saving salary date setting:', err);
      toast.error(err?.response?.data?.message || 'Failed to save salary date configuration.');
    } finally {
      setSavingSalaryDate(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (isTeacher) return;
    try {
      await updateSalaryStatusApi(id, newStatus);
      toast.success('Payment status updated successfully.');
      setSalaries((prev) =>
        prev.map((s) => (s.id === id ? { ...s, payment_status: Number(newStatus) } : s))
      );
      loadBulkCandidates();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status.');
    }
  };

  // Retry failed or pending salary payments without re-paying already paid employees
  const handleRetrySalaries = async (idsToRetry) => {
    if (isTeacher) return;
    const validIds = (Array.isArray(idsToRetry) ? idsToRetry : [idsToRetry])
      .map(Number)
      .filter((id) => !isNaN(id) && id > 0);
    if (validIds.length === 0) {
      toast.info('Please select at least one failed or pending payment to retry.');
      return;
    }

    try {
      setRetrying(true);
      const res = await retryFailedSalariesApi({
        salary_ids: validIds,
        payment_date:
          salaryDateSetting?.configured_salary_date ||
          bulkPaymentDate ||
          new Date().toISOString().split('T')[0],
      });
      const summary = res?.data?.summary || res?.summary || {};
      const results = res?.data?.results || res?.results || [];

      if (summary.successful > 0) {
        toast.success(res?.message || `${summary.successful} payment(s) retried successfully.`);
      } else {
        const firstFail = results.find((r) => r.outcome === 'failed');
        toast.warning(firstFail?.message || res?.message || 'Retry could not complete.');
      }

      setSelectedHistoryIds([]);
      await loadData();
      await loadBulkCandidates();
    } catch (err) {
      console.error('Error retrying failed salaries:', err);
      toast.error(err?.response?.data?.message || 'Failed to retry salary payments.');
    } finally {
      setRetrying(false);
    }
  };

  // Filtered candidates in Bulk Salary step 1
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (!isEmployeeActive(c)) {
        return false;
      }
      if (bulkEligibilityFilter === 'eligible' && (!c.is_beneficiary_verified || c.is_already_paid)) {
        return false;
      }
      if (bulkEligibilityFilter === 'ineligible' && c.is_beneficiary_verified) {
        return false;
      }
      if (bulkEligibilityFilter === 'paid' && !c.is_already_paid) {
        return false;
      }
      if (bulkSearch.trim()) {
        const q = bulkSearch.trim().toLowerCase();
        const matchName = (c.name || '').toLowerCase().includes(q);
        const matchCode = (c.employee_code || '').toLowerCase().includes(q);
        const matchType = (c.type_name || '').toLowerCase().includes(q);
        const matchBank = (c.bank_name || '').toLowerCase().includes(q);
        const matchCampus = (c.campus_name || '').toLowerCase().includes(q);
        const matchBranchId = String(c.branch_id || '').toLowerCase().includes(q);
        return matchName || matchCode || matchType || matchBank || matchCampus || matchBranchId;
      }
      return true;
    });
  }, [candidates, bulkEligibilityFilter, bulkSearch, isEmployeeActive]);

  // Eligible selectable candidates in current filtered view
  const selectableFilteredCandidates = useMemo(
    () => filteredCandidates.filter((c) => Boolean(c.is_beneficiary_verified) && !c.is_already_paid),
    [filteredCandidates]
  );

  const isAllEligibleSelected =
    selectableFilteredCandidates.length > 0 &&
    selectableFilteredCandidates.every((c) => selectedCandidateKeys.includes(getCandidateKey(c)));

  const handleToggleSelectAllCandidates = () => {
    if (selectableFilteredCandidates.length === 0) {
      toast.info('No eligible unpaid employees available to select in the current filter.');
      return;
    }
    const filteredKeys = selectableFilteredCandidates.map((c) => getCandidateKey(c));
    if (isAllEligibleSelected) {
      const removeSet = new Set(filteredKeys);
      setSelectedCandidateKeys((prev) => prev.filter((k) => !removeSet.has(k)));
    } else {
      setSelectedCandidateKeys((prev) => Array.from(new Set([...prev, ...filteredKeys])));
    }
  };

  const handleToggleCandidate = (candidate) => {
    if (!candidate.is_beneficiary_verified || candidate.is_already_paid) return;
    const key = getCandidateKey(candidate);
    setSelectedCandidateKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleAdjustmentChange = (key, field, value) => {
    setCustomAdjustments((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
    }));
  };

  // Compute live salary values for a candidate using fixed 30-day month basis:
  // Per-Day Salary = Monthly Salary / 30
  // Salary Deduction = Per-Day Salary * Unpaid Leave Days
  // Final Payable Salary = Monthly Salary - Salary Deduction (- Additional Deductions)
  const computeCandidateNumbers = useCallback(
    (c) => {
      const FIXED_SALARY_DAYS = 30;
      const key = getCandidateKey(c);
      const adj = customAdjustments[key] || {};
      const hasCustomBase = adj.basic_salary !== undefined && adj.basic_salary !== '';
      const baseSalary = hasCustomBase
        ? Math.max(0, Number(adj.basic_salary) || 0)
        : Number(c.basic_salary || 0);
      const unpaidLeaveDays = Math.max(0, Math.min(FIXED_SALARY_DAYS, Number(c.unpaid_leave_days || 0)));
      const rawPerDaySalary = baseSalary > 0 ? baseSalary / FIXED_SALARY_DAYS : 0;
      const perDaySalary = Number(rawPerDaySalary.toFixed(2));
      const leaveDeduction =
        baseSalary > 0 && unpaidLeaveDays > 0
          ? Number(Math.min(baseSalary, rawPerDaySalary * unpaidLeaveDays).toFixed(2))
          : 0;
      const additionalDeduction = Math.max(0, Number(adj.additional_deductions || 0));
      const totalDeductions = Number(Math.min(baseSalary, leaveDeduction + additionalDeduction).toFixed(2));
      const finalPayable = Number(Math.max(0, baseSalary - totalDeductions).toFixed(2));
      return {
        baseSalary,
        perDaySalary,
        leaveDeduction,
        additionalDeduction,
        totalDeductions,
        finalPayable,
        rawBaseInput: adj.basic_salary !== undefined ? adj.basic_salary : String(Number(c.basic_salary || 0)),
        rawAdditionalInput: adj.additional_deductions !== undefined ? adj.additional_deductions : '',
        customTxId: adj.transaction_id || '',
        rowStatus: adj.payment_status !== undefined ? Number(adj.payment_status) : bulkPaymentStatus,
      };
    },
    [customAdjustments, bulkPaymentStatus, getCandidateKey]
  );

  const selectedCandidatesList = useMemo(
    () =>
      candidates.filter(
        (c) =>
          selectedCandidateKeys.includes(getCandidateKey(c)) &&
          c.is_beneficiary_verified &&
          !c.is_already_paid
      ),
    [candidates, selectedCandidateKeys, getCandidateKey]
  );

  const bulkTotals = useMemo(() => {
    let totalBase = 0;
    let totalLeaveDed = 0;
    let totalAddDed = 0;
    let totalDed = 0;
    let totalNet = 0;

    selectedCandidatesList.forEach((c) => {
      const nums = computeCandidateNumbers(c);
      totalBase += nums.baseSalary;
      totalLeaveDed += nums.leaveDeduction;
      totalAddDed += nums.additionalDeduction;
      totalDed += nums.totalDeductions;
      totalNet += nums.finalPayable;
    });

    return {
      count: selectedCandidatesList.length,
      totalBase: Number(totalBase.toFixed(2)),
      totalLeaveDed: Number(totalLeaveDed.toFixed(2)),
      totalAddDed: Number(totalAddDed.toFixed(2)),
      totalDed: Number(totalDed.toFixed(2)),
      totalNet: Number(totalNet.toFixed(2)),
    };
  }, [selectedCandidatesList, computeCandidateNumbers]);

  const handleProceedToReview = () => {
    if (selectedCandidatesList.length === 0) {
      toast.warning('Please select at least one eligible employee with verified beneficiary/bank details.');
      return;
    }
    const zeroBaseEmp = selectedCandidatesList.find((c) => computeCandidateNumbers(c).baseSalary <= 0);
    if (zeroBaseEmp) {
      toast.warning(`Please enter a valid Base Salary (> 0) for ${zeroBaseEmp.name}.`);
      return;
    }
    if (!bulkPaymentDate) {
      toast.warning('Please select a Payment Date.');
      return;
    }
    setBulkStep('review');
  };

  const handleConfirmBulkPayment = async () => {
    if (selectedCandidatesList.length === 0) return;
    try {
      setProcessingBulk(true);
      const payloadEmployees = selectedCandidatesList.map((c) => {
        const nums = computeCandidateNumbers(c);
        return {
          school_id: c.school_id || currentUser?.schoolId || currentUser?.school_id,
          branch_id: c.branch_id || currentUser?.branchId || currentUser?.branch_id || undefined,
          user_type: c.user_type,
          employee_id: c.id,
          name: c.name,
          basic_salary: nums.baseSalary,
          additional_deductions: nums.additionalDeduction,
          total_deductions: nums.totalDeductions,
          transaction_id: nums.customTxId || undefined,
          payment_status: nums.rowStatus,
        };
      });

      const res = await processBulkSalaryApi({
        salary_month: bulkMonth,
        payment_date: bulkPaymentDate,
        payment_status: bulkPaymentStatus,
        transaction_prefix: bulkTxPrefix,
        employees: payloadEmployees,
      });

      const resultData = res?.data || res;
      setBulkResult(resultData);
      setBulkStep('result');
      toast.success(res?.message || 'Bulk salary payment processed.');
      await loadData();
      await loadBulkCandidates(bulkMonth, bulkUserType);
    } catch (err) {
      console.error('Error processing bulk salary:', err);
      toast.error(err?.response?.data?.message || 'Failed to process bulk salary payment.');
    } finally {
      setProcessingBulk(false);
    }
  };

  const formatMonthYear = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusLabel = (statusVal) => {
    const s = Number(statusVal);
    if (s === 1) return 'Paid';
    if (s === 3) return 'Failed';
    return 'Pending';
  };

  // Directly generate and download Salary Slip PDF without any modal preview
  const handleDirectDownloadPDF = async (salary) => {
    try {
      setDownloadingId(salary.id);

      const monthYear = formatMonthYear(salary.payment_date);
      const amountInWords = numberToWords(salary.net_salary)
        ? `${numberToWords(salary.net_salary)} Rupees Only`
        : 'Zero Only';
      const designation =
        salary.type_name ||
        (Number(salary.user_type) === 2 ? 'Teacher' : Number(salary.user_type) === 3 ? 'Driver' : 'Staff');
      const basicSalary = Number(salary.basic_salary || 0).toFixed(2);
      const totalDeductions = Number(salary.total_deductions || 0).toFixed(2);
      const netSalary = Number(salary.net_salary || 0).toFixed(2);
      const resolvedSchoolId = salary.school_id || currentUser?.schoolId || currentUser?.school_id || '—';
      const resolvedBranchId = salary.branch_id || currentUser?.branchId || currentUser?.branch_id || '—';

      const element = document.createElement('div');
      element.style.padding = '30px';
      element.style.backgroundColor = '#ffffff';
      element.style.fontFamily = 'Arial, Helvetica, sans-serif';
      element.style.color = '#000000';
      element.style.width = '750px';
      element.style.boxSizing = 'border-box';

      const dynamicSchoolLogo =
        resolveImageUrl(
          currentUser?.schoolLogo ||
            currentUser?.school_logo ||
            authUser?.schoolLogo ||
            authUser?.school_logo
        ) || schoolLogoDefault;
      element.innerHTML = `
        <div style="text-align: center; border-bottom: 1px solid #000; margin-bottom: 18px; padding-bottom: 8px;">
          <img src="${dynamicSchoolLogo}" alt="Logo" style="max-height: 48px; max-width: 180px; margin-bottom: 8px; display: inline-block; object-fit: contain;" />
          <h3 style="margin: 4px 0 0; font-size: 18px; font-weight: bold; color: #000;">Salary Slip - ${monthYear}</h3>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000;">
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 7px 10px; width: 50%; font-size: 13px;"><strong>Employee Name:</strong> ${salary.employee_name || '—'}</td>
              <td style="border: 1px solid #000; padding: 7px 10px; width: 50%; font-size: 13px;"><strong>Employee ID:</strong> ${salary.employee_id || '—'}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;"><strong>School ID:</strong> ${resolvedSchoolId}</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;"><strong>Branch ID:</strong> ${resolvedBranchId}${salary.campus_name ? ` (${salary.campus_name})` : ''}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;"><strong>Designation:</strong> ${designation}</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;"><strong>Payment Date:</strong> ${salary.payment_date || '—'}</td>
            </tr>
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #000;">
          <thead>
            <tr style="background-color: #000; color: #fff;">
              <th style="border: 1px solid #000; padding: 7px 10px; text-align: left; font-size: 13px;">Earnings</th>
              <th style="border: 1px solid #000; padding: 7px 10px; text-align: left; font-size: 13px;">Amount</th>
              <th style="border: 1px solid #000; padding: 7px 10px; text-align: left; font-size: 13px;">Deductions</th>
              <th style="border: 1px solid #000; padding: 7px 10px; text-align: left; font-size: 13px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Basic Salary</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">${basicSalary}</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Provident Fund</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">0.00</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">House Rent Allowance</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">0.00</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Professional Tax</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">0.00</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Medical Allowance</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">0.00</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Leave / Other Deductions</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">${totalDeductions}</td>
            </tr>
            <tr style="font-weight: bold; background-color: #f3f4f6;">
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Total Earnings</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">${basicSalary}</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Total Deductions</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">${totalDeductions}</td>
            </tr>
            <tr style="font-weight: bold; background-color: #eeeeee;">
              <td colspan="3" style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">Net Salary</td>
              <td style="border: 1px solid #000; padding: 7px 10px; font-size: 13px;">${netSalary}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 18px; font-size: 13px;">
          <strong>Amount in Words:</strong> ${amountInWords}
        </div>

        <div style="text-align: right; margin-top: 45px; font-weight: bold; font-size: 13px;">
          Authorized Signature
        </div>
      `;

      const safeName = (salary.employee_name || 'Employee').trim().replace(/\s+/g, '_');
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Salary_Slip_${safeName}_${salary.payment_date || 'slip'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('Salary slip downloaded successfully.');
    } catch (err) {
      console.error('Error downloading salary slip PDF:', err);
      toast.error('Failed to generate salary slip PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportExcel = () => {
    if (!filteredData.length) {
      toast.info('No data to export.');
      return;
    }
    const headers = [
      'Sl No.',
      'School ID',
      'Branch ID',
      'Branch Name',
      'Name',
      'Type',
      'Bank Name',
      'Account No',
      'Amount',
      'Total Deductions',
      'Net Salary',
      'Payment Date',
      'Transaction',
      'Status',
    ];
    const rows = filteredData.map((s, idx) => [
      idx + 1,
      s.school_id ?? (currentUser?.schoolId || currentUser?.school_id || ''),
      s.branch_id ?? (currentUser?.branchId || currentUser?.branch_id || ''),
      `"${(s.campus_name || '').replace(/"/g, '""')}"`,
      `"${(s.employee_name || '').replace(/"/g, '""')}"`,
      s.type_name || (Number(s.user_type) === 2 ? 'Teacher' : Number(s.user_type) === 3 ? 'Driver' : 'Staff'),
      `"${(s.bank_name || '').replace(/"/g, '""')}"`,
      `"${(s.account_no || '').replace(/"/g, '""')}"`,
      Number(s.basic_salary || 0).toFixed(2),
      Number(s.total_deductions || 0).toFixed(2),
      Number(s.net_salary || 0).toFixed(2),
      s.payment_date || '',
      `"${(s.transaction_id || '').replace(/"/g, '""')}"`,
      getStatusLabel(s.payment_status),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Salary_List_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPI metrics from real salary records
  const salaryStats = useMemo(() => {
    let paidCount = 0;
    let paidAmount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let failedCount = 0;
    let failedAmount = 0;
    const failedIds = [];

    salaries.forEach((s) => {
      const st = Number(s.payment_status || 1);
      const net = Number(s.net_salary || 0);
      if (st === 1) {
        paidCount++;
        paidAmount += net;
      } else if (st === 3) {
        failedCount++;
        failedAmount += net;
        failedIds.push(s.id);
      } else {
        pendingCount++;
        pendingAmount += net;
      }
    });

    return {
      totalCount: salaries.length,
      paidCount,
      paidAmount,
      pendingCount,
      pendingAmount,
      failedCount,
      failedAmount,
      failedIds,
    };
  }, [salaries]);

  const filteredData = useMemo(() => {
    return salaries.filter((s) => {
      if (!isEmployeeActive(s)) {
        return false;
      }
      if (statusFilter && String(s.payment_status || 1) !== String(statusFilter)) {
        return false;
      }
      if (typeFilter && String(s.user_type) !== String(typeFilter)) {
        return false;
      }
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const name = (s.employee_name || '').toLowerCase();
        const tx = (s.transaction_id || '').toLowerCase();
        const date = (s.payment_date || '').toLowerCase();
        const bank = (s.bank_name || '').toLowerCase();
        const campus = (s.campus_name || '').toLowerCase();
        const bId = String(s.branch_id || '').toLowerCase();
        const sId = String(s.school_id || '').toLowerCase();
        return (
          name.includes(q) ||
          tx.includes(q) ||
          date.includes(q) ||
          bank.includes(q) ||
          campus.includes(q) ||
          bId.includes(q) ||
          sId.includes(q)
        );
      }
      return true;
    });
  }, [salaries, statusFilter, typeFilter, tableSearch, isEmployeeActive]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // All rows on current history page can be selected via Select All
  const isAllHistoryOnPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((s) => selectedHistoryIds.includes(s.id));

  // Retryable subset of selected history rows (Failed=3 or Pending=2)
  const selectedRetryableIds = useMemo(
    () =>
      salaries
        .filter((s) => selectedHistoryIds.includes(s.id) && Number(s.payment_status) !== 1)
        .map((s) => s.id),
    [salaries, selectedHistoryIds]
  );

  const handleToggleHistoryRow = (id) => {
    setSelectedHistoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllHistoryOnPage = () => {
    if (paginatedData.length === 0) return;
    const pageIds = paginatedData.map((s) => s.id);
    if (isAllHistoryOnPageSelected) {
      const pageSet = new Set(pageIds);
      setSelectedHistoryIds((prev) => prev.filter((id) => !pageSet.has(id)));
    } else {
      setSelectedHistoryIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  return (
    <div className="content" style={{ height: 'auto', minHeight: 'auto', maxHeight: 'none', overflowY: 'visible' }}>
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">{isTeacher ? 'My Salary' : 'Bulk Salary Payment'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              {!isTeacher && <li className="breadcrumb-item">Payroll</li>}
              <li className="breadcrumb-item active" aria-current="page">
                {isTeacher ? 'My Salary' : 'Bulk Salary Payment'}
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={() => {
                loadData();
                if (!isTeacher) loadBulkCandidates();
              }}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Refresh"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
          <div className="me-2 mb-2">
            <TableActionMenu
              trigger={
                <span className="btn btn-light fw-medium d-inline-flex align-items-center">
                  <i className="ti ti-file-export me-2"></i>Export
                </span>
              }
              items={[
                {
                  label: 'Export as Excel',
                  icon: 'ti ti-file-type-xls text-success',
                  onClick: handleExportExcel,
                },
              ]}
            />
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Payment Status Summary Cards (Admin Only) */}
      {!isTeacher && (
        <div className="row g-3 mb-3">
          <div className="col-xl-3 col-sm-6">
            <div className="card mb-0 border-0 shadow-sm">
              <div className="card-body d-flex align-items-center justify-content-between py-3">
                <div>
                  <p className="text-muted mb-1 fs-12 fw-medium">Successful Payments (Paid)</p>
                  <h4 className="mb-0 fw-bold text-success">{salaryStats.paidCount}</h4>
                  <small className="text-muted">
                    Total: ₹{salaryStats.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </small>
                </div>
                <span className="avatar avatar-lg bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center">
                  <i className="ti ti-circle-check fs-24"></i>
                </span>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-sm-6">
            <div className="card mb-0 border-0 shadow-sm">
              <div className="card-body d-flex align-items-center justify-content-between py-3">
                <div>
                  <p className="text-muted mb-1 fs-12 fw-medium">Pending Payments</p>
                  <h4 className="mb-0 fw-bold text-warning">{salaryStats.pendingCount}</h4>
                  <small className="text-muted">
                    Total: ₹{salaryStats.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </small>
                </div>
                <span className="avatar avatar-lg bg-warning-subtle text-warning rounded-circle d-inline-flex align-items-center justify-content-center">
                  <i className="ti ti-clock-hour-4 fs-24"></i>
                </span>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-sm-6">
            <div className="card mb-0 border-0 shadow-sm">
              <div className="card-body d-flex align-items-center justify-content-between py-3">
                <div>
                  <p className="text-muted mb-1 fs-12 fw-medium">Failed Payments</p>
                  <div className="d-flex align-items-center gap-2">
                    <h4 className="mb-0 fw-bold text-danger">{salaryStats.failedCount}</h4>
                    {salaryStats.failedCount > 0 && (
                      <button
                        type="button"
                        disabled={retrying}
                        onClick={() => handleRetrySalaries(salaryStats.failedIds)}
                        className="btn btn-xs btn-danger py-0.5 px-2 fs-11"
                        title="Retry all failed payments without paying already-paid employees"
                      >
                        <i className="ti ti-reload me-1"></i>
                        {retrying ? 'Retrying...' : 'Retry Failed'}
                      </button>
                    )}
                  </div>
                  <small className="text-muted">
                    Total: ₹{salaryStats.failedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </small>
                </div>
                <span className="avatar avatar-lg bg-danger-subtle text-danger rounded-circle d-inline-flex align-items-center justify-content-center">
                  <i className="ti ti-alert-octagon fs-24"></i>
                </span>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-sm-6">
            <div className="card mb-0 border-0 shadow-sm">
              <div className="card-body d-flex align-items-center justify-content-between py-3">
                <div>
                  <p className="text-muted mb-1 fs-12 fw-medium">Total Salary Records</p>
                  <h4 className="mb-0 fw-bold text-primary">{salaryStats.totalCount}</h4>
                  <small className="text-muted">All tracked history</small>
                </div>
                <span className="avatar avatar-lg bg-primary-subtle text-primary rounded-circle d-inline-flex align-items-center justify-content-center">
                  <i className="ti ti-receipt-rupee fs-24"></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BULK SALARY PAYMENT WORKSPACE (Admin Only - Always Visible)           */}
      {/* ===================================================================== */}
      {!isTeacher && (
        <div className="card border-primary mb-4 shadow-sm">
          <div className="card-header bg-primary-subtle d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h4 className="mb-0 text-dark d-flex align-items-center">
                <i className="ti ti-users-group text-primary me-2 fs-20"></i>
                Bulk Salary Payment & Leave Deduction Calculator
              </h4>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span
                className={`badge ${
                  bulkStep === 'select' ? 'bg-primary text-white' : 'bg-light text-dark border'
                } px-2.5 py-1.5`}
              >
                1. Select & Calculate
              </span>
              <i className="ti ti-chevron-right text-muted"></i>
              <span
                className={`badge ${
                  bulkStep === 'review' ? 'bg-primary text-white' : 'bg-light text-dark border'
                } px-2.5 py-1.5`}
              >
                2. Review & Confirm
              </span>
              <i className="ti ti-chevron-right text-muted"></i>
              <span
                className={`badge ${
                  bulkStep === 'result' ? 'bg-success text-white' : 'bg-light text-dark border'
                } px-2.5 py-1.5`}
              >
                3. Payment Status
              </span>
            </div>
          </div>

          <div className="card-body">
            {/* STEP 1: SELECT EMPLOYEES & CALCULATE LEAVE DEDUCTIONS */}
            {bulkStep === 'select' && (
              <>
                <div className="row g-3 mb-3 align-items-end bg-light p-3 rounded-2 border">
                  <div className="col-md-2">
                    <label className="form-label fw-semibold small mb-1">Salary Month</label>
                    <input
                      type="month"
                      className="form-control form-control-sm"
                      value={bulkMonth}
                      onChange={(e) => {
                        const m = e.target.value;
                        setBulkMonth(m);
                        if (m && !bulkPaymentDate.startsWith(m)) {
                          const dayNum = salaryDateSetting?.salary_day || 1;
                          const [yr, mo] = m.split('-').map(Number);
                          const maxD = new Date(yr, mo, 0).getDate();
                          const clamped = String(Math.min(dayNum, maxD)).padStart(2, '0');
                          setBulkPaymentDate(`${m}-${clamped}`);
                        }
                      }}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold small mb-1 d-flex align-items-center justify-content-between">
                      <span>Payment Date</span>
                      {salaryDateSetting?.salary_day && (
                        <span className="badge bg-info-subtle text-info border border-info-subtle" style={{ fontSize: '10px' }}>
                          Day {salaryDateSetting.salary_day}
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={bulkPaymentDate}
                      onChange={(e) => {
                        const dt = e.target.value;
                        setBulkPaymentDate(dt);
                        if (dt && dt.slice(0, 7) !== bulkMonth) {
                          setBulkMonth(dt.slice(0, 7));
                        }
                      }}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold small mb-1">Beneficiary Type</label>
                    <select
                      className="form-select form-select-sm"
                      value={bulkUserType}
                      onChange={(e) => setBulkUserType(e.target.value)}
                    >
                      <option value="">All Registered Types</option>
                      <option value="1">1 - Staff (user_master)</option>
                      <option value="2">2 - Teacher (teacher_master)</option>
                      <option value="3">3 - Driver (operator_master)</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold small mb-1">Eligibility Filter</label>
                    <select
                      className="form-select form-select-sm"
                      value={bulkEligibilityFilter}
                      onChange={(e) => setBulkEligibilityFilter(e.target.value)}
                    >
                      <option value="all">All Beneficiaries ({candidates.length})</option>
                      <option value="eligible">
                        Eligible & Unpaid ({candidates.filter((c) => c.is_beneficiary_verified && !c.is_already_paid).length})
                      </option>
                      <option value="ineligible">
                        Missing Bank ({candidates.filter((c) => !c.is_beneficiary_verified).length})
                      </option>
                      <option value="paid">
                        Already Paid ({candidates.filter((c) => c.is_already_paid).length})
                      </option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold small mb-1">Payment Status</label>
                    <select
                      className="form-select form-select-sm"
                      value={bulkPaymentStatus}
                      onChange={(e) => setBulkPaymentStatus(Number(e.target.value))}
                    >
                      <option value={1}>Paid (Successful)</option>
                      <option value={2}>Pending</option>
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold small mb-1">Search Beneficiary</label>
                    <input
                      type="search"
                      className="form-control form-control-sm"
                      placeholder="Name, ID, Bank..."
                      value={bulkSearch}
                      onChange={(e) => setBulkSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Selection Toolbar */}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        isAllEligibleSelected ? 'btn-outline-secondary' : 'btn-outline-primary'
                      } d-inline-flex align-items-center`}
                      disabled={selectableFilteredCandidates.length === 0}
                      onClick={handleToggleSelectAllCandidates}
                    >
                      <i
                        className={`ti ${
                          isAllEligibleSelected ? 'ti-square-x' : 'ti-checkbox'
                        } me-1`}
                      ></i>
                      {isAllEligibleSelected
                        ? `Deselect All Eligible (${selectableFilteredCandidates.length})`
                        : `Select All Eligible (${selectableFilteredCandidates.length})`}
                    </button>
                    {selectedCandidateKeys.length > 0 && (
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                        {selectedCandidateKeys.length} employee(s) selected
                      </span>
                    )}
                  </div>
                  <div className="small text-muted">
                    Showing <strong>{filteredCandidates.length}</strong> employee(s) •{' '}
                    <span className="text-success fw-medium">
                      {selectableFilteredCandidates.length} eligible for bulk payment
                    </span>
                  </div>
                </div>

                <div className="table-responsive border rounded-2">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '48px' }} className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            style={{ cursor: selectableFilteredCandidates.length > 0 ? 'pointer' : 'not-allowed' }}
                            checked={isAllEligibleSelected}
                            disabled={selectableFilteredCandidates.length === 0}
                            onClick={(e) => e.stopPropagation()}
                            onChange={handleToggleSelectAllCandidates}
                            title="Select all eligible employees with bank/beneficiary details"
                          />
                        </th>
                        <th>Employee</th>
                        <th>Beneficiary / Bank Details</th>
                        <th>Leave Records ({bulkMonth})</th>
                        <th style={{ width: '145px' }} className="text-end">Base Salary (₹)</th>
                        <th className="text-end">Leave Deduction</th>
                        <th style={{ width: '130px' }} className="text-end">Other Deduction</th>
                        <th className="text-end">Final Payable</th>
                        <th className="text-center">Month Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingCandidates ? (
                        <tr>
                          <td colSpan="9" className="text-center py-4">
                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                            <span className="text-muted">Checking employee beneficiary/bank records and leave deductions...</span>
                          </td>
                        </tr>
                      ) : filteredCandidates.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-4 text-muted">
                            No employees found matching the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredCandidates.map((c) => {
                          const key = getCandidateKey(c);
                          const isSelected = selectedCandidateKeys.includes(key);
                          const isSelectable = Boolean(c.is_beneficiary_verified) && !c.is_already_paid;
                          const nums = computeCandidateNumbers(c);

                          return (
                            <tr
                              key={key}
                              onClick={() => {
                                if (isSelectable) handleToggleCandidate(c);
                              }}
                              style={{ cursor: isSelectable ? 'pointer' : 'default' }}
                              className={
                                isSelected
                                  ? 'table-primary'
                                  : !c.is_beneficiary_verified
                                  ? 'bg-light opacity-75'
                                  : ''
                              }
                            >
                              <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  style={{ cursor: isSelectable ? 'pointer' : 'not-allowed' }}
                                  checked={isSelected}
                                  disabled={!isSelectable}
                                  onChange={() => handleToggleCandidate(c)}
                                  title={
                                    c.is_already_paid
                                      ? 'Already paid for this month'
                                      : !c.is_beneficiary_verified
                                      ? `Ineligible: ${(c.beneficiary_issues || []).join(', ')}`
                                      : 'Select employee for bulk salary payment'
                                  }
                                />
                              </td>
                              <td>
                                <div className="fw-semibold text-dark">{c.name || '—'}</div>
                                <div className="d-flex align-items-center gap-1 mt-0.5">
                                  <span
                                    className={`badge ${
                                      c.type_name === 'Teacher'
                                        ? 'bg-info-transparent text-info'
                                        : c.type_name === 'Driver'
                                        ? 'bg-warning-transparent text-warning'
                                        : 'bg-primary-transparent text-primary'
                                    } fs-10 px-1.5 py-0.5`}
                                  >
                                    {c.type_name}
                                  </span>
                                </div>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                {c.is_beneficiary_verified ? (
                                  <div>
                                    <span className="badge bg-success-subtle text-success border border-success-subtle mb-1">
                                      <i className="ti ti-shield-check me-1"></i>
                                      {c.beneficiary_id ? 'Verified Beneficiary' : 'Bank Account Added'}
                                    </span>
                                    <div className="small text-muted">
                                      <strong>{c.bank_name}</strong> • A/C: <code>{c.account_no}</code>
                                      {c.ifsc_code ? (
                                        <>
                                          {' '}
                                          • IFSC: <code>{c.ifsc_code}</code>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle mb-1">
                                      <i className="ti ti-alert-circle me-1"></i>Not Eligible
                                    </span>
                                    <div className="small text-danger">
                                      {(c.beneficiary_issues || []).join(' • ')}
                                    </div>
                                    <Link
                                      to={
                                        c.beneficiary_id
                                          ? `/admin/payroll/beneficiaries/edit/${encodeParam(c.beneficiary_id)}`
                                          : '/admin/payroll/beneficiaries/add'
                                      }
                                      className="btn btn-link btn-sm p-0 fs-11 text-primary text-decoration-none"
                                    >
                                      <i className="ti ti-external-link me-1"></i>
                                      {c.beneficiary_id ? 'Update Beneficiary' : 'Add Beneficiary'}
                                    </Link>
                                  </div>
                                )}
                              </td>
                              <td>
                                <div className="small">
                                  <span className="me-2">
                                    Paid: <strong>{Number(c.paid_leave_days || 0)}d</strong>
                                  </span>
                                  <span
                                    className={
                                      Number(c.unpaid_leave_days || 0) > 0
                                        ? 'text-danger fw-bold'
                                        : 'text-muted'
                                    }
                                  >
                                    Unpaid: <strong>{Number(c.unpaid_leave_days || 0)}d</strong>
                                  </span>
                                </div>
                                {Array.isArray(c.leave_breakdown) && c.leave_breakdown.length > 0 ? (
                                  <div className="mt-1">
                                    {c.leave_breakdown.map((lb, lIdx) => {
                                      const lbDeduction =
                                        nums.baseSalary > 0 && Number(lb.unpaid_days || 0) > 0
                                          ? (nums.baseSalary / 30) * Number(lb.unpaid_days)
                                          : Number(lb.deduction_amount || 0);
                                      return (
                                        <div key={lIdx} className="fs-11 text-muted">
                                          • {lb.leave_name}: {lb.total_days}d{' '}
                                          {lb.unpaid_days > 0 ? (
                                            <span className="text-danger">
                                              ({lb.unpaid_days}d unpaid = -₹{Number(lbDeduction).toFixed(2)})
                                            </span>
                                          ) : (
                                            <span className="text-success">(Paid)</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <small className="text-muted fs-11">No approved leaves in {bulkMonth}</small>
                                )}
                              </td>
                              <td className="text-end" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!isSelectable}
                                  className="form-control form-control-sm text-end fw-semibold"
                                  placeholder="0.00"
                                  value={nums.rawBaseInput}
                                  onChange={(e) =>
                                    handleAdjustmentChange(key, 'basic_salary', e.target.value)
                                  }
                                />
                              </td>
                              <td className="text-end text-danger fw-medium">
                                {nums.leaveDeduction > 0 ? `-₹${nums.leaveDeduction.toFixed(2)}` : '₹0.00'}
                              </td>
                              <td className="text-end" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  disabled={!isSelectable}
                                  className="form-control form-control-sm text-end"
                                  placeholder="0.00"
                                  value={nums.rawAdditionalInput}
                                  onChange={(e) =>
                                    handleAdjustmentChange(key, 'additional_deductions', e.target.value)
                                  }
                                />
                              </td>
                              <td className="text-end fw-bold text-success">
                                ₹{nums.finalPayable.toFixed(2)}
                              </td>
                              <td className="text-center">
                                {c.is_already_paid ? (
                                  <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                    <i className="ti ti-check me-1"></i>Paid
                                  </span>
                                ) : c.existing_payment_status === 3 ? (
                                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
                                    <i className="ti ti-alert-triangle me-1"></i>Failed (Retryable)
                                  </span>
                                ) : c.existing_payment_status === 2 ? (
                                  <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
                                    Pending
                                  </span>
                                ) : c.is_beneficiary_verified ? (
                                  <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1">
                                    Eligible
                                  </span>
                                ) : (
                                  <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                                    Ineligible
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Step 1 Footer Bar */}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mt-3 pt-3 border-top">
                  <div className="d-flex flex-wrap align-items-center gap-4">
                    <div>
                      <span className="text-muted small">Selected Employees:</span>{' '}
                      <strong className="text-dark fs-15">{bulkTotals.count}</strong>
                    </div>
                    <div>
                      <span className="text-muted small">Total Base Salary:</span>{' '}
                      <strong className="text-dark">₹{bulkTotals.totalBase.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-muted small">Leave Deductions:</span>{' '}
                      <strong className="text-danger">-₹{bulkTotals.totalLeaveDed.toFixed(2)}</strong>
                    </div>
                    {bulkTotals.totalAddDed > 0 && (
                      <div>
                        <span className="text-muted small">Other Deductions:</span>{' '}
                        <strong className="text-danger">-₹{bulkTotals.totalAddDed.toFixed(2)}</strong>
                      </div>
                    )}
                    <div>
                      <span className="text-muted small">Total Final Payable:</span>{' '}
                      <strong className="text-success fs-16">₹{bulkTotals.totalNet.toFixed(2)}</strong>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {selectedCandidateKeys.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => setSelectedCandidateKeys([])}
                      >
                        Clear Selection
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary d-flex align-items-center"
                      disabled={bulkTotals.count === 0}
                      onClick={handleProceedToReview}
                    >
                      Review & Process Bulk Salary ({bulkTotals.count})
                      <i className="ti ti-arrow-right ms-2"></i>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: PRE-PAYMENT SALARY CALCULATION & REVIEW */}
            {bulkStep === 'review' && (
              <>
                <div className="alert alert-info d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                  <div>
                    <i className="ti ti-info-circle me-2 fs-18"></i>
                    <strong>Salary Calculation & Review:</strong> Please review each selected employee&apos;s base salary, unpaid leave deductions, bank/beneficiary account, and final payable amount before confirming the bulk payment.
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <label className="small fw-semibold mb-0">Batch Ref Prefix (Optional):</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      style={{ width: '170px' }}
                      placeholder={`SAL-${bulkPaymentDate.replace(/-/g, '')}`}
                      value={bulkTxPrefix}
                      onChange={(e) => setBulkTxPrefix(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-responsive border rounded-2 mb-3">
                  <table className="table table-bordered align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Employee</th>
                        <th>Verified Bank Account</th>
                        <th className="text-center">Unpaid Leave</th>
                        <th className="text-end">Base Salary</th>
                        <th className="text-end">Leave Deduction</th>
                        <th className="text-end">Other Deduction</th>
                        <th className="text-end">Total Deductions</th>
                        <th className="text-end">Final Payable</th>
                        <th style={{ width: '175px' }}>Transaction Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCandidatesList.map((c, idx) => {
                        const key = getCandidateKey(c);
                        const nums = computeCandidateNumbers(c);
                        return (
                          <tr key={key}>
                            <td>{idx + 1}</td>
                            <td>
                              <div className="fw-semibold text-dark">{c.name}</div>
                              <small className="text-muted">
                                {c.type_name}
                              </small>
                            </td>
                            <td>
                              <div className="small">
                                <strong>{c.bank_name}</strong> ({c.branch_name || 'Main'})
                              </div>
                              <div className="fs-11 text-muted">
                                A/C: <code>{c.account_no}</code>
                                {c.ifsc_code ? (
                                  <>
                                    {' '}
                                    • IFSC: <code>{c.ifsc_code}</code>
                                  </>
                                ) : null}
                              </div>
                            </td>
                            <td className="text-center">
                              {Number(c.unpaid_leave_days || 0) > 0 ? (
                                <span className="badge bg-danger-subtle text-danger">
                                  {c.unpaid_leave_days} day(s)
                                </span>
                              ) : (
                                <span className="text-muted">0 days</span>
                              )}
                            </td>
                            <td className="text-end">₹{nums.baseSalary.toFixed(2)}</td>
                            <td className="text-end text-danger">-₹{nums.leaveDeduction.toFixed(2)}</td>
                            <td className="text-end text-danger">-₹{nums.additionalDeduction.toFixed(2)}</td>
                            <td className="text-end text-danger fw-semibold">
                              -₹{nums.totalDeductions.toFixed(2)}
                            </td>
                            <td className="text-end fw-bold text-success fs-15">
                              ₹{nums.finalPayable.toFixed(2)}
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Auto-generated"
                                value={nums.customTxId}
                                onChange={(e) =>
                                  handleAdjustmentChange(key, 'transaction_id', e.target.value)
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan="4" className="text-end">
                          Total ({bulkTotals.count} Employees):
                        </td>
                        <td className="text-end">₹{bulkTotals.totalBase.toFixed(2)}</td>
                        <td className="text-end text-danger">-₹{bulkTotals.totalLeaveDed.toFixed(2)}</td>
                        <td className="text-end text-danger">-₹{bulkTotals.totalAddDed.toFixed(2)}</td>
                        <td className="text-end text-danger">-₹{bulkTotals.totalDed.toFixed(2)}</td>
                        <td className="text-end text-success fs-16">₹{bulkTotals.totalNet.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-flex align-items-center"
                    disabled={processingBulk}
                    onClick={() => setBulkStep('select')}
                  >
                    <i className="ti ti-arrow-left me-2"></i>Back to Selection
                  </button>
                  <button
                    type="button"
                    className="btn btn-success d-flex align-items-center px-4"
                    disabled={processingBulk}
                    onClick={handleConfirmBulkPayment}
                  >
                    <i className="ti ti-cash me-2"></i>
                    {processingBulk
                      ? 'Processing Bulk Salary...'
                      : `Confirm & Pay ₹${bulkTotals.totalNet.toFixed(2)} (${bulkTotals.count} Employees)`}
                  </button>
                </div>
              </>
            )}

            {/* STEP 3: INDIVIDUAL PAYMENT STATUS TRACKING & RETRY RESULTS */}
            {bulkStep === 'result' && bulkResult && (
              <>
                <div className="row g-3 mb-3">
                  <div className="col-sm-3">
                    <div className="p-3 rounded-2 border bg-success-subtle border-success-subtle text-center">
                      <div className="text-muted small">Successful (Paid)</div>
                      <h4 className="mb-0 fw-bold text-success">{bulkResult.summary?.successful || 0}</h4>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 rounded-2 border bg-warning-subtle border-warning-subtle text-center">
                      <div className="text-muted small">Pending</div>
                      <h4 className="mb-0 fw-bold text-warning">{bulkResult.summary?.pending || 0}</h4>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 rounded-2 border bg-danger-subtle border-danger-subtle text-center">
                      <div className="text-muted small">Failed</div>
                      <h4 className="mb-0 fw-bold text-danger">{bulkResult.summary?.failed || 0}</h4>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 rounded-2 border bg-light text-center">
                      <div className="text-muted small">Skipped (Already Paid)</div>
                      <h4 className="mb-0 fw-bold text-secondary">
                        {bulkResult.summary?.skipped_already_paid || 0}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="table-responsive border rounded-2 mb-3">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Employee</th>
                        <th className="text-end">Base Salary</th>
                        <th className="text-end">Total Deductions</th>
                        <th className="text-end">Net Salary</th>
                        <th>Transaction Ref</th>
                        <th className="text-center">Status</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bulkResult.results || []).map((r, idx) => (
                        <tr key={idx}>
                          <td className="fw-semibold">{r.name || '—'}</td>
                          <td className="text-end">
                            {r.basic_salary !== undefined ? `₹${Number(r.basic_salary).toFixed(2)}` : '—'}
                          </td>
                          <td className="text-end text-danger">
                            {r.total_deductions !== undefined
                              ? `-₹${Number(r.total_deductions).toFixed(2)}`
                              : '—'}
                          </td>
                          <td className="text-end fw-bold text-success">
                            {r.net_salary !== undefined ? `₹${Number(r.net_salary).toFixed(2)}` : '—'}
                          </td>
                          <td>
                            <code>{r.transaction_id || '—'}</code>
                          </td>
                          <td className="text-center">
                            {Number(r.payment_status) === 1 ? (
                              <span className="badge bg-success-subtle text-success">Paid</span>
                            ) : Number(r.payment_status) === 3 ? (
                              <span className="badge bg-danger-subtle text-danger">Failed</span>
                            ) : (
                              <span className="badge bg-warning-subtle text-warning">Pending</span>
                            )}
                          </td>
                          <td className="small text-muted">{r.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedCandidateKeys([]);
                      setBulkResult(null);
                      setBulkStep('select');
                    }}
                  >
                    Back to Bulk Salary Workspace
                  </button>
                  <div className="d-flex align-items-center gap-2">
                    {(bulkResult.results || []).some((r) => Number(r.payment_status) === 3 && r.salary_id) && (
                      <button
                        type="button"
                        disabled={retrying}
                        className="btn btn-danger"
                        onClick={() => {
                          const failedBatchIds = (bulkResult.results || [])
                            .filter((r) => Number(r.payment_status) === 3 && r.salary_id)
                            .map((r) => r.salary_id);
                          handleRetrySalaries(failedBatchIds);
                        }}
                      >
                        <i className="ti ti-reload me-1"></i>
                        {retrying ? 'Retrying...' : 'Retry Failed Payments in Batch'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Salary List Card */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap pb-0 gap-2">
          <h4 className="mb-3">{isTeacher ? 'My Salary Statement' : 'Salary Payment History'}</h4>
          {!isTeacher && (
            <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
              {selectedRetryableIds.length > 0 && (
                <button
                  type="button"
                  disabled={retrying}
                  onClick={() => handleRetrySalaries(selectedRetryableIds)}
                  className="btn btn-sm btn-warning fw-semibold d-flex align-items-center"
                >
                  <i className="ti ti-reload me-1"></i>
                  {retrying ? 'Retrying...' : `Retry Selected Failed/Pending (${selectedRetryableIds.length})`}
                </button>
              )}
              <select
                className="form-select form-select-sm"
                style={{ width: '140px' }}
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Roles</option>
                <option value="2">Teacher</option>
                <option value="1">Staff</option>
                <option value="3">Driver</option>
              </select>
              <select
                className="form-select form-select-sm"
                style={{ width: '160px' }}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Status</option>
                <option value="1">Paid (Successful)</option>
                <option value="2">Pending</option>
                <option value="3">Failed</option>
              </select>
            </div>
          )}
        </div>
        <div className="card-body p-0 py-3">
          <div className="custom-datatable-filter">
            <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
              <div className="row px-3 mb-3 align-items-center">
                <div className="col-sm-12 col-md-6 mb-2 mb-md-0">
                  <div className="dataTables_length" id="DataTables_Table_0_length">
                    <label className="d-inline-flex align-items-center gap-2 mb-0">
                      Row Per Page{' '}
                      <select
                        name="DataTables_Table_0_length"
                        aria-controls="DataTables_Table_0"
                        className="form-select form-select-sm"
                        style={{ width: '80px', display: 'inline-block' }}
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>{' '}
                      Entries
                    </label>
                  </div>
                </div>
                <div className="col-sm-12 col-md-6 text-md-end">
                  <div id="DataTables_Table_0_filter" className="dataTables_filter d-inline-block">
                    <label className="d-inline-flex align-items-center gap-2 mb-0">
                      <input
                        type="search"
                        className="form-control form-control-sm"
                        placeholder="Search"
                        aria-controls="DataTables_Table_0"
                        value={tableSearch}
                        onChange={(e) => {
                          setTableSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="row dt-row">
                <div className="col-sm-12 table-responsive">
                  <table
                    className="table datatable dataTable no-footer"
                    id="DataTables_Table_0"
                    style={{ tableLayout: 'auto' }}
                  >
                    <thead className="thead-light">
                      <tr>
                        {!isTeacher && (
                          <th className="text-center" style={{ width: '42px' }}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              style={{ cursor: paginatedData.length > 0 ? 'pointer' : 'not-allowed' }}
                              checked={isAllHistoryOnPageSelected}
                              disabled={paginatedData.length === 0}
                              onClick={(e) => e.stopPropagation()}
                              onChange={handleToggleSelectAllHistoryOnPage}
                              title="Select all records on this page"
                            />
                          </th>
                        )}
                        <th className="text-center sorting sorting_asc" style={{ width: '72.359px' }}>
                          Sl No.
                        </th>
                        <th className="text-center sorting" style={{ width: '198.188px' }}>
                          Name
                        </th>
                        <th className="text-center sorting" style={{ width: '115.016px' }}>
                          Amount
                        </th>
                        <th className="text-center sorting" style={{ width: '171.625px' }}>
                          Total Deductions
                        </th>
                        <th className="text-center sorting" style={{ width: '115.016px' }}>
                          Net Salary
                        </th>
                        <th className="text-center sorting" style={{ width: '145.547px' }}>
                          Payment Date
                        </th>
                        <th className="text-center sorting" style={{ width: '208.266px' }}>
                          Transaction
                        </th>
                        <th className="text-center sorting" style={{ width: '154.797px' }}>
                          Status
                        </th>
                        <th className="text-center sorting" style={{ width: '77.188px' }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={isTeacher ? 9 : 10} className="text-center py-4">
                            <div
                              className="spinner-border spinner-border-sm text-primary me-2"
                              role="status"
                            ></div>
                            <span className="text-muted">Loading salary records...</span>
                          </td>
                        </tr>
                      ) : paginatedData.length === 0 ? (
                        <tr>
                          <td colSpan={isTeacher ? 9 : 10} className="text-center py-4">
                            <NoData title="No Salary Records Found" message="No salary records found." />
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((s, idx) => {
                          const globalIdx = (currentPage - 1) * pageSize + idx;
                          const isOdd = idx % 2 === 0;
                          const isDownloadingThis = downloadingId === s.id;
                          const statusNum = Number(s.payment_status || 1);
                          const isPaid = statusNum === 1;
                          const isFailed = statusNum === 3;

                          const actionItems = [
                            {
                              label: isDownloadingThis ? 'Downloading...' : 'Download PDF',
                              icon: 'ti ti-download text-primary',
                              onClick: () => handleDirectDownloadPDF(s),
                            },
                          ];

                          if (!isTeacher && !isPaid) {
                            actionItems.push({
                              label: retrying ? 'Retrying...' : 'Retry Payment',
                              icon: 'ti ti-reload text-success',
                              onClick: () => handleRetrySalaries([s.id]),
                            });
                          }

                          return (
                            <tr key={s.id || idx} className={isOdd ? 'odd' : 'even'}>
                              {!isTeacher && (
                                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    style={{ cursor: 'pointer' }}
                                    checked={selectedHistoryIds.includes(s.id)}
                                    onChange={() => handleToggleHistoryRow(s.id)}
                                    title="Select salary record"
                                  />
                                </td>
                              )}
                              <td className="text-center sorting_1">{globalIdx + 1}</td>
                              <td className="text-center">
                                <div className="fw-semibold text-dark">{s.employee_name || '—'}</div>
                                {s.type_name && (
                                  <span
                                    className={`badge ${
                                      s.type_name === 'Teacher'
                                        ? 'bg-info-transparent text-info border border-info-subtle'
                                        : s.type_name === 'Driver'
                                        ? 'bg-warning-transparent text-warning border border-warning-subtle'
                                        : 'bg-primary-transparent text-primary border border-primary-subtle'
                                    } px-2 py-0.5 fs-11 mt-1`}
                                  >
                                    {s.type_name}
                                  </span>
                                )}
                              </td>
                              <td className="text-center">
                                {Number(s.basic_salary || 0).toFixed(2)}
                              </td>
                              <td className="text-center text-danger">
                                {Number(s.total_deductions || 0).toFixed(2)}
                              </td>
                              <td className="text-center fw-bold text-success">
                                {Number(s.net_salary || 0).toFixed(2)}
                              </td>
                              <td className="text-center">{s.payment_date || '—'}</td>
                              <td className="text-center">
                                <div>{s.transaction_id || '—'}</div>
                                {s.bank_name && (
                                  <small className="text-muted fs-11">
                                    {s.bank_name} {s.account_no ? `(${s.account_no})` : ''}
                                  </small>
                                )}
                              </td>
                              <td className="text-center">
                                {isTeacher ? (
                                  <span
                                    className={`badge ${
                                      isPaid
                                        ? 'bg-success-subtle text-success border border-success-subtle'
                                        : isFailed
                                        ? 'bg-danger-subtle text-danger border border-danger-subtle'
                                        : 'bg-warning-subtle text-warning border border-warning-subtle'
                                    } px-2 py-1 fs-12`}
                                  >
                                    {getStatusLabel(statusNum)}
                                  </span>
                                ) : (
                                  <select
                                    className="form-select form-select-sm"
                                    name="payment_status"
                                    value={statusNum}
                                    onChange={(e) => handleStatusChange(s.id, e.target.value)}
                                    style={{
                                      width: '108px',
                                      display: 'inline-block',
                                      color: isPaid ? '#0d6832' : isFailed ? '#b91c1c' : '#b45309',
                                      backgroundColor: isPaid
                                        ? '#e8f7ee'
                                        : isFailed
                                        ? '#fee2e2'
                                        : '#fef3c7',
                                      borderColor: isPaid
                                        ? '#bbf7d0'
                                        : isFailed
                                        ? '#fecaca'
                                        : '#fde68a',
                                      fontWeight: '500',
                                    }}
                                  >
                                    <option value="1">Paid</option>
                                    <option value="2">Pending</option>
                                    <option value="3">Failed</option>
                                  </select>
                                )}
                              </td>
                              <td className="text-center">
                                <TableActionMenu items={actionItems} />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="row px-3 mt-3 align-items-center">
                <div className="col-sm-12 col-md-5">
                  <div className="dataTables_info text-muted small">
                    Showing{' '}
                    {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                    {Math.min(currentPage * pageSize, filteredData.length)} of{' '}
                    {filteredData.length} entries
                  </div>
                </div>
                <div className="col-sm-12 col-md-7">
                  <div
                    className="dataTables_paginate paging_simple_numbers d-flex justify-content-md-end"
                    id="DataTables_Table_0_paginate"
                  >
                    <ul className="pagination pagination-sm mb-0">
                      <li
                        className={`paginate_button page-item previous ${
                          currentPage === 1 ? 'disabled' : ''
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Prev
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <li
                          key={page}
                          className={`paginate_button page-item ${
                            currentPage === page ? 'active' : ''
                          }`}
                        >
                          <button className="page-link" onClick={() => setCurrentPage(page)}>
                            {page}
                          </button>
                        </li>
                      ))}
                      <li
                        className={`paginate_button page-item next ${
                          currentPage === totalPages || totalPages === 0 ? 'disabled' : ''
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages || totalPages === 0}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Salary List Card */}
    </div>
  );
};

export default SalaryManagement;
