import { FileText, TrendingUp, Users, Package, Clock, RefreshCw, X, Trophy, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import ExcelJS from 'exceljs'
import { useLanguage } from '../../hooks/useLanguage'
import { CollectionAPI, InventoryAPI, InventoryItem, AuthAPI, FinanceAPI } from '../../services/api'

type ReportFormat = 'pdf' | 'excel'
type ReportId = 'daily_collection' | 'monthly_financial' | 'inventory_stock' | 'ta_performance' | 'small_holder_ranking' | 'debt_ageing'

function escapeCsvValue(value: string | number | null | undefined) {
   const normalized = value === null || value === undefined ? '' : String(value)
   if (/[",\n]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`
   }
   return normalized
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
   const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n')

   const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
   const url = URL.createObjectURL(blob)
   const link = document.createElement('a')
   link.href = url
   link.download = filename
   document.body.appendChild(link)
   link.click()
   document.body.removeChild(link)
   URL.revokeObjectURL(url)
}

function formatCurrency(value: number) {
   return `Rs. ${value.toLocaleString()}`
}

function getInventoryCategoryLabel(category: string, t: (key: string) => string) {
   switch (category) {
      case 'FERTILIZER':
         return t('Fertilizer')
      case 'LEAF_BAG':
         return t('Leaf Bag')
      case 'TOOLS':
         return t('Tools')
      default:
         return t(category.replace(/_/g, ' '))
   }
}

function isLowStock(item: InventoryItem) {
   return item.quantityInStock <= item.reorderLevel
}

type TAPerformanceRow = {
   id: string
   name: string
   agentCode: string
   totalWeight: number
   collectionCount: number
   pendingCount: number
   activeDays: number
   averageWeight: number
}

type DailyCollectionRecord = {
   date: string
   collectionCount: number
   grossWeight: number
   netWeight: number
   uniqueSuppliers: number
   pendingCount: number
}

type MonthlyFinancialRecord = {
   supplierId: string
   supplierName: string
   passbookNo: string
   gross: number
   adv: number
   debt: number
   netPay: number
   status: string
   totalAmount: number
   payoutAmount: number
   pendingAmount: number
   transactionCount: number
}

type DebtAgeingRow = {
   supplierId: string
   passBookNo: string
   leafRoute: string
   name: string
   previousAmount: number
   currentAmount: number
   difference: number
   previousAge0to30: number
   previousAge31to60: number
   previousAge61to90: number
   previousAge91to180: number
   previousAgeOver180: number
   age0to30: number
   age31to60: number
   age61to90: number
   age91to180: number
   ageOver180: number
   quantityPrevious: number
   quantityCurrent: number
   remarks: string
}

function startOfMonth(date: Date) {
   return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
   return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function getOrdinalSuffix(day: number) {
   if (day >= 11 && day <= 13) return 'th'
   switch (day % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
   }
}

function normalizeSupplierRole(role: string | undefined) {
   return String(role || '').toUpperCase()
}

function getSupplierKey(value: any) {
   return String(value || '').trim()
}

function formatMoney(value: number | string | null | undefined) {
   const numericValue = Number(value || 0)
   return numericValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function endOfSelectedMonth(month: number, year: number) {
   return new Date(year, month, 0, 23, 59, 59, 999)
}

function getAgeBucket(days: number) {
   if (days <= 30) return 'age0to30'
   if (days <= 60) return 'age31to60'
   if (days <= 90) return 'age61to90'
   if (days <= 180) return 'age91to180'
   return 'ageOver180'
}

function getMonthLabel(date: Date) {
   const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase()
   return `${month} ${String(date.getFullYear()).slice(-2)}`
}

function getMonthTitle(date: Date) {
   return `${date.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${String(date.getFullYear()).slice(-2)}`
}

function getPreviousMonthEnd(month: number, year: number) {
   return new Date(year, month - 1, 0, 23, 59, 59, 999)
}

function getDebtRemark(quantityCurrent: number, quantityPrevious: number, currentAmount: number, previousAmount: number) {
   if (quantityCurrent > 0 && currentAmount <= previousAmount) return 'Leaf Supplied and already recovered'
   if (quantityCurrent > 0 && currentAmount > previousAmount) return 'Leaf Supplied and Recoveries to be done'
   if (quantityCurrent <= 0 && currentAmount > 0) return 'Not supplied Leaf'
   if (previousAmount > currentAmount && quantityCurrent > 0) return 'Agreed to settle Installment Basis'
   return 'Other'
}

function getRemarkFill(remark: string) {
   switch (remark) {
      case 'Leaf Supplied and already recovered':
         return 'FFE8F5E9' // Beautiful light pastel green
      case 'Leaf Supplied and Recoveries to be done':
         return 'FFE8F8F5' // Very light pastel teal/green
      case 'Not supplied Leaf':
         return 'FFFFE0B2' // Light pastel orange
      case 'Agreed to settle Installment Basis':
         return 'FFFFF9C4' // Light pastel yellow
      case 'Over 180 days -S amathamandala / police inquiry Legal action':
         return 'FFFFCDD2' // Light pastel red
      case 'Over 180 days -S amathamandala / police inquiry Legal action (blue)':
         return 'FFE3F2FD' // Light pastel blue
      default:
         return 'FFFFFFFF'
   }
}

type DebtSnapshot = {
   totalOutstanding: number
   age0to30: number
   age31to60: number
   age61to90: number
   age91to180: number
   ageOver180: number
}

function emptyDebtSnapshot(): DebtSnapshot {
   return {
      totalOutstanding: 0,
      age0to30: 0,
      age31to60: 0,
      age61to90: 0,
      age91to180: 0,
      ageOver180: 0,
   }
}

function calculateDebtSnapshot(transactions: any[], cutoff: Date): DebtSnapshot {
   const snapshot = emptyDebtSnapshot()
   const cutoffTime = cutoff.getTime()

   (transactions || [])
      .filter((transaction: any) => transaction.transactionType === 'DEBT')
      .forEach((transaction: any) => {
         const transactionDate = transaction.transactionDate ? new Date(transaction.transactionDate) : null
         if (!transactionDate || Number.isNaN(transactionDate.getTime()) || transactionDate.getTime() > cutoffTime) return

         const amount = Number(transaction.remaining ?? transaction.amount ?? 0)
         const ageDays = Math.max(0, Math.floor((cutoffTime - transactionDate.getTime()) / (1000 * 60 * 60 * 24)))
         const bucket = getAgeBucket(ageDays)

         snapshot.totalOutstanding += amount
         snapshot[bucket as keyof Omit<DebtSnapshot, 'totalOutstanding'>] += amount
      })

   return snapshot
}

async function downloadDebtAgeingWorkbook(filename: string, estateTitle: string, summaryRows: Array<{ label: string; current: DebtSnapshot; previous: DebtSnapshot }>, dataRows: DebtAgeingRow[], currentDate: Date, previousDate: Date) {
   const workbook = new ExcelJS.Workbook()
   workbook.creator = 'දළුපොත'
   workbook.created = new Date()
   workbook.modified = new Date()

   const worksheet = workbook.addWorksheet('Kuru-Ageing', {
      views: [{ state: 'frozen', ySplit: 12 }],
      properties: { defaultRowHeight: 22 },
   })

   worksheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
   }

   worksheet.columns = [
      { key: 'leafRoute', width: 14 },
      { key: 'passBookNo', width: 16 },
      { key: 'name', width: 26 },
      { key: 'currentAmount', width: 22 },
      { key: 'previousAmount', width: 22 },
      { key: 'difference', width: 22 },
      { key: 'age0to30', width: 14 },
      { key: 'age31to60', width: 14 },
      { key: 'age61to90', width: 14 },
      { key: 'age91to180', width: 14 },
      { key: 'ageOver180', width: 14 },
      { key: 'quantityPrevious', width: 26 },
      { key: 'quantityCurrent', width: 26 },
      { key: 'remarks', width: 40 },
   ]

   // 1. Header Banner
   worksheet.mergeCells('A1:N1')
   const titleCell = worksheet.getCell('A1')
   titleCell.value = `${estateTitle.toUpperCase()} - DEBT AGEING REPORT`
   titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
   titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
   titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } }
   worksheet.getRow(1).height = 30

   // 2. Summary Headers
   worksheet.mergeCells('B3:C3')
   const sHeader1 = worksheet.getCell('B3')
   sHeader1.value = 'Month / Description'
   sHeader1.alignment = { horizontal: 'center', vertical: 'middle' }
   sHeader1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C9141' } }
   sHeader1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
   sHeader1.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }

   const sHeader2 = worksheet.getCell('D3')
   sHeader2.value = 'Total Outstanding'
   sHeader2.alignment = { horizontal: 'center', vertical: 'middle' }
   sHeader2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C9141' } }
   sHeader2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
   sHeader2.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }

   worksheet.mergeCells('E3:I3')
   const sHeader3 = worksheet.getCell('E3')
   sHeader3.value = 'Age Analysis - No. of days'
   sHeader3.alignment = { horizontal: 'center', vertical: 'middle' }
   sHeader3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C9141' } }
   sHeader3.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
   sHeader3.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }

   // 3. Summary Detail Headers
   const detailHeaders = [
      { col: 'B', val: 'Month' },
      { col: 'C', val: 'Value' },
      { col: 'E', val: '< 30' },
      { col: 'F', val: '31 - 60' },
      { col: 'G', val: '61 - 90' },
      { col: 'H', val: '91 - 180' },
      { col: 'I', val: '> 181' },
   ]

   detailHeaders.forEach((dh) => {
      const cell = worksheet.getCell(`${dh.col}4`)
      cell.value = dh.val
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
      cell.font = { bold: true, size: 9 }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
   })

   const summaryStartRow = 5
   summaryRows.forEach((summary, index) => {
      const rowNumber = summaryStartRow + index
      const isVariance = summary.label.toLowerCase() === 'variance'
      const monthCell = worksheet.getCell(`B${rowNumber}`)
      const valueCell = worksheet.getCell(`C${rowNumber}`)
      const value = isVariance
         ? summary.current.totalOutstanding - summary.previous.totalOutstanding
         : summary.current.totalOutstanding

      monthCell.value = summary.label
      monthCell.font = { italic: isVariance, size: 9, bold: isVariance }
      monthCell.alignment = { horizontal: 'center', vertical: 'middle' }

      valueCell.value = value
      valueCell.numFmt = '#,##0.00;[Red](#,##0.00)'
      valueCell.alignment = { horizontal: 'right', vertical: 'middle' }
      if (isVariance) {
         valueCell.font = { bold: true, color: { argb: value < 0 ? 'FF2D6A4F' : 'FFC53030' }, size: 9 }
      } else {
         valueCell.font = { size: 9 }
      }

      const bucketValues = [
         isVariance ? summary.current.age0to30 - summary.previous.age0to30 : summary.current.age0to30,
         isVariance ? summary.current.age31to60 - summary.previous.age31to60 : summary.current.age31to60,
         isVariance ? summary.current.age61to90 - summary.previous.age61to90 : summary.current.age61to90,
         isVariance ? summary.current.age91to180 - summary.previous.age91to180 : summary.current.age91to180,
         isVariance ? summary.current.ageOver180 - summary.previous.ageOver180 : summary.current.ageOver180,
      ]

      bucketValues.forEach((val, bucketIndex) => {
         const cell = worksheet.getCell(rowNumber, 5 + bucketIndex)
         cell.value = val
         cell.numFmt = '#,##0.00;[Red](#,##0.00)'
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
         cell.font = { 
            color: { argb: val < 0 ? 'FF2D6A4F' : (isVariance ? 'FFC53030' : 'FF000000') },
            size: 9,
            bold: isVariance
         }
      })

      ;[monthCell, valueCell, ...[0, 1, 2, 3, 4].map((bucketIndex) => worksheet.getCell(rowNumber, 5 + bucketIndex))].forEach((cell) => {
         cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      })
   })

   // Legend Table Layout (placed side-by-side with summary table)
   const legendStartCol = 11
   const legendEntries = [
      { color: 'FFE8F5E9', text: 'Leaf Supplied and already recovered' },
      { color: 'FFE8F8F5', text: 'Leaf Supplied and Recoveries to be done' },
      { color: 'FFFFE0B2', text: 'Not supplied Leaf' },
      { color: 'FFFFF9C4', text: 'Agreed to settle Installment Basis' },
      { color: 'FFFFCDD2', text: 'Over 180 days - Legal action / dispute' },
      { color: 'FFE3F2FD', text: 'Over 180 days - Dispute resolving' },
      { color: 'FFFFFFFF', text: 'Other / Custom status' },
   ]

   // Legend Headers
   const lHeader1 = worksheet.getCell(3, legendStartCol)
   lHeader1.value = 'Status'
   lHeader1.alignment = { horizontal: 'center', vertical: 'middle' }
   lHeader1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C9141' } }
   lHeader1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
   lHeader1.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }

   worksheet.mergeCells(`L3:N3`)
   const lHeader2 = worksheet.getCell(3, legendStartCol + 1)
   lHeader2.value = 'Settle Category / Description'
   lHeader2.alignment = { horizontal: 'center', vertical: 'middle' }
   lHeader2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C9141' } }
   lHeader2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
   lHeader2.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }

   legendEntries.forEach((entry, index) => {
      const rowNumber = 4 + index
      const colorCell = worksheet.getCell(rowNumber, legendStartCol)
      
      colorCell.value = ''
      colorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: entry.color } }
      colorCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      
      worksheet.mergeCells(`L${rowNumber}:N${rowNumber}`)
      const textCell = worksheet.getCell(rowNumber, legendStartCol + 1)
      textCell.value = entry.text
      textCell.font = { bold: false, size: 8 }
      textCell.alignment = { horizontal: 'left', vertical: 'middle' }
      textCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
   })

   // 4. Main Section Header
   worksheet.mergeCells('A11:O11')
   const sectionHeaderCell = worksheet.getCell('A11')
   sectionHeaderCell.value = 'Age Analysis of the Balance Outstanding'
   sectionHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' }
   sectionHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } }
   sectionHeaderCell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }
   worksheet.getRow(11).height = 26

   const currentMonthLabel = getMonthLabel(currentDate)
   const previousMonthLabel = getMonthLabel(previousDate)

   const tableHeaders = [
      'Leaf Route',
      'Pass Book No',
      'Name',
      `Amount (Rs) - ${currentMonthLabel}`,
      `Amount (Rs) - ${previousMonthLabel}`,
      'Increase / (Decrease)',
      '0 - 30 Days',
      '31 - 60 Days',
      '61 - 90 Days',
      '91 - 180 Days',
      '> 180 Days',
      `Qty Supplied in ${previousMonthLabel} (kg)`,
      `Qty Supplied in ${currentMonthLabel} (kg)`,
      'Remarks / Status',
   ]

   tableHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(12, 1 + index)
      cell.value = header
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C9141' } }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } }
   })
   worksheet.getRow(12).height = 28

   dataRows.forEach((row, index) => {
      const excelRow = worksheet.getRow(13 + index)
      const remark = row.remarks || 'Other'
      const fillColor = getRemarkFill(remark)

      excelRow.values = [
         row.leafRoute,
         row.passBookNo,
         row.name,
         row.currentAmount,
         row.previousAmount,
         row.difference,
         row.age0to30,
         row.age31to60,
         row.age61to90,
         row.age91to180,
         row.ageOver180,
         row.quantityPrevious,
         row.quantityCurrent,
         remark,
      ]

      excelRow.eachCell({ includeEmpty: true }, (cell) => {
         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } }
         cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
         cell.alignment = { vertical: 'middle', wrapText: true }
         cell.font = { size: 10 }
      })

      ;[4, 5, 6, 7, 8, 9, 10, 11].forEach((colIdx) => {
         const cell = excelRow.getCell(colIdx)
         cell.numFmt = '#,##0.00;[Red](#,##0.00)'
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
      })

      ;[12, 13].forEach((colIdx) => {
         const cell = excelRow.getCell(colIdx)
         cell.numFmt = '#,##0'
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
      })

      excelRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
      excelRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
      excelRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' }
      excelRow.getCell(14).alignment = { horizontal: 'left', vertical: 'middle' }
      excelRow.height = 22
   })

   // 6. Totals Row for Main Table
   const totalsRowIdx = 13 + dataRows.length
   const totalsRow = worksheet.getRow(totalsRowIdx)

   totalsRow.values = [
      'Total',
      '',
      '',
      { formula: `=SUM(D13:D${totalsRowIdx - 1})` },
      { formula: `=SUM(E13:E${totalsRowIdx - 1})` },
      { formula: `=SUM(F13:F${totalsRowIdx - 1})` },
      { formula: `=SUM(G13:G${totalsRowIdx - 1})` },
      { formula: `=SUM(H13:H${totalsRowIdx - 1})` },
      { formula: `=SUM(I13:I${totalsRowIdx - 1})` },
      { formula: `=SUM(J13:J${totalsRowIdx - 1})` },
      { formula: `=SUM(K13:K${totalsRowIdx - 1})` },
      { formula: `=SUM(L13:L${totalsRowIdx - 1})` },
      { formula: `=SUM(M13:M${totalsRowIdx - 1})` },
      '',
   ]

   totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
      cell.font = { bold: true, size: 10 }
      cell.border = { 
         top: { style: 'thin' }, 
         left: { style: 'thin' }, 
         bottom: { style: 'double' }, 
         right: { style: 'thin' } 
      }
      cell.alignment = { vertical: 'middle' }

      if (colNumber === 1) {
         cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else if (colNumber >= 4 && colNumber <= 11) {
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
         cell.numFmt = '#,##0.00;[Red](#,##0.00)'
      } else if (colNumber === 12 || colNumber === 13) {
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
         cell.numFmt = '#,##0'
      }
   })
   totalsRow.height = 24

   worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 12 }]

   const buffer = await workbook.xlsx.writeBuffer()
   const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
   const url = URL.createObjectURL(blob)
   const link = document.createElement('a')
   link.href = url
   link.download = filename
   document.body.appendChild(link)
   link.click()
   document.body.removeChild(link)
   URL.revokeObjectURL(url)
}

async function downloadDailyCollectionWorkbook(filename: string, estateTitle: string, monthName: string, year: number, dataRows: DailyCollectionRecord[]) {
   const workbook = new ExcelJS.Workbook()
   workbook.creator = 'දළුපොත'
   workbook.created = new Date()
   workbook.modified = new Date()

   const worksheet = workbook.addWorksheet('Daily Collections', {
      views: [{ state: 'frozen', ySplit: 5 }],
      properties: { defaultRowHeight: 22 },
   })

   worksheet.pageSetup = {
      orientation: 'portrait',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
   }

   worksheet.columns = [
      { key: 'date', width: 18 },
      { key: 'collectionCount', width: 16 },
      { key: 'grossWeight', width: 22 },
      { key: 'netWeight', width: 22 },
      { key: 'uniqueSuppliers', width: 20 },
      { key: 'pendingCount', width: 15 },
   ]

   // 1. Header Banner
   worksheet.mergeCells('A1:F1')
   const titleCell = worksheet.getCell('A1')
   titleCell.value = `${estateTitle.toUpperCase()} - DAILY COLLECTION REPORT`
   titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
   titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
   titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } }
   worksheet.getRow(1).height = 30

   // 2. Sub-header / Period
   worksheet.mergeCells('A2:F2')
   const periodCell = worksheet.getCell('A2')
   periodCell.value = `Period: ${monthName} ${year}`
   periodCell.font = { bold: true, size: 10, italic: true, color: { argb: 'FF475569' } }
   periodCell.alignment = { horizontal: 'center', vertical: 'middle' }
   periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
   worksheet.getRow(2).height = 20

   // 3. Separator
   worksheet.mergeCells('A3:F3')
   worksheet.getCell('A3').value = ''

   // 4. Table Headers
   const tableHeaders = ['Date', 'Collections', 'Gross Weight (kg)', 'Net Weight (kg)', 'Unique Suppliers', 'Pending']
   tableHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(5, 1 + index)
      cell.value = header
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C9141' } }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } }
   })
   worksheet.getRow(5).height = 26

   // 5. Data Rows
   dataRows.forEach((row, index) => {
      const rowNumber = 6 + index
      const excelRow = worksheet.getRow(rowNumber)
      
      const formattedDate = new Date(row.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
      excelRow.values = [
         formattedDate,
         row.collectionCount,
         row.grossWeight,
         row.netWeight,
         row.uniqueSuppliers,
         row.pendingCount,
      ]

      const isEven = index % 2 === 0
      const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'

      excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } }
         cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
         cell.alignment = { vertical: 'middle' }
         cell.font = { size: 10 }

         if (colNumber === 1) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
         } else if (colNumber === 2 || colNumber === 5) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
            cell.numFmt = '#,##0'
         } else if (colNumber === 3 || colNumber === 4) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
            cell.numFmt = '#,##0.00'
         } else if (colNumber === 6) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
            cell.numFmt = '#,##0'
            if (row.pendingCount > 0) {
               cell.font = { bold: true, color: { argb: 'FFEE4444' } }
            }
         }
      })
      excelRow.height = 22
   })

   // 6. Totals Row
   const totalsRowIdx = 6 + dataRows.length
   const totalsRow = worksheet.getRow(totalsRowIdx)
   
   totalsRow.values = [
      'Total',
      { formula: `=SUM(B6:B${totalsRowIdx - 1})` },
      { formula: `=SUM(C6:C${totalsRowIdx - 1})` },
      { formula: `=SUM(D6:D${totalsRowIdx - 1})` },
      { formula: `=SUM(E6:E${totalsRowIdx - 1})` },
      { formula: `=SUM(F6:F${totalsRowIdx - 1})` },
   ]

   totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
      cell.font = { bold: true, size: 10 }
      cell.border = { 
         top: { style: 'thin' }, 
         left: { style: 'thin' }, 
         bottom: { style: 'double' }, 
         right: { style: 'thin' } 
      }
      cell.alignment = { vertical: 'middle' }

      if (colNumber === 1) {
         cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else if (colNumber === 2 || colNumber === 5) {
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
         cell.numFmt = '#,##0'
      } else if (colNumber === 3 || colNumber === 4) {
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
         cell.numFmt = '#,##0.00'
      } else if (colNumber === 6) {
         cell.alignment = { horizontal: 'center', vertical: 'middle' }
         cell.numFmt = '#,##0'
      }
   })
   totalsRow.height = 24

   const buffer = await workbook.xlsx.writeBuffer()
   const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
   const url = URL.createObjectURL(blob)
   const link = document.createElement('a')
   link.href = url
   link.download = filename
   document.body.appendChild(link)
   link.click()
   document.body.removeChild(link)
   URL.revokeObjectURL(url)
}

async function downloadMonthlyFinancialWorkbook(filename: string, estateTitle: string, monthName: string, year: number, dataRows: MonthlyFinancialRecord[]) {
   const workbook = new ExcelJS.Workbook()
   workbook.creator = 'දළුපොත'
   workbook.created = new Date()
   workbook.modified = new Date()

   const worksheet = workbook.addWorksheet('Monthly Financials', {
      views: [{ state: 'frozen', ySplit: 5 }],
      properties: { defaultRowHeight: 22 },
   })

   worksheet.pageSetup = {
      orientation: 'portrait',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
   }

   worksheet.columns = [
      { key: 'supplierName', width: 26 },
      { key: 'passbookNo', width: 16 },
      { key: 'gross', width: 18 },
      { key: 'adv', width: 18 },
      { key: 'debt', width: 18 },
      { key: 'netPay', width: 18 },
      { key: 'status', width: 16 },
   ]

   // 1. Header Banner
   worksheet.mergeCells('A1:G1')
   const titleCell = worksheet.getCell('A1')
   titleCell.value = `${estateTitle.toUpperCase()} - MONTHLY FINANCIAL REPORT`
   titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
   titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
   titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } }
   worksheet.getRow(1).height = 30

   // 2. Sub-header / Period
   worksheet.mergeCells('A2:G2')
   const periodCell = worksheet.getCell('A2')
   periodCell.value = `Period: ${monthName} ${year}`
   periodCell.font = { bold: true, size: 10, italic: true, color: { argb: 'FF475569' } }
   periodCell.alignment = { horizontal: 'center', vertical: 'middle' }
   periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
   worksheet.getRow(2).height = 20

   // 3. Separator
   worksheet.mergeCells('A3:G3')
   worksheet.getCell('A3').value = ''

   // 4. Table Headers
   const tableHeaders = ['Supplier', 'Passbook No', 'Gross (Rs.)', 'Advance Ded. (Rs.)', 'Debt Ded. (Rs.)', 'Net Pay (Rs.)', 'Status']
   tableHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(5, 1 + index)
      cell.value = header
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C9141' } }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } }
   })
   worksheet.getRow(5).height = 26

   // 5. Data Rows
   dataRows.forEach((row, index) => {
      const rowNumber = 6 + index
      const excelRow = worksheet.getRow(rowNumber)
      
      excelRow.values = [
         row.supplierName,
         row.passbookNo,
         row.gross,
         row.adv > 0 ? -row.adv : 0,
         row.debt > 0 ? -row.debt : 0,
         row.netPay,
         row.status,
      ]

      const isEven = index % 2 === 0
      const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'

      excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } }
         cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
         cell.alignment = { vertical: 'middle' }
         cell.font = { size: 10 }

         if (colNumber === 1) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' }
         } else if (colNumber === 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
         } else if (colNumber >= 3 && colNumber <= 6) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
            cell.numFmt = '#,##0.00'
            if (colNumber === 6 && row.netPay < 0) {
               cell.font = { color: { argb: 'FFEE4444' }, bold: true }
            } else if (colNumber === 4 || colNumber === 5) {
               const val = Number(cell.value);
               if (val < 0) {
                  cell.font = { color: { argb: 'FFEE4444' } }
               }
            }
         } else if (colNumber === 7) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
            if (row.status === 'APPROVED' || row.status === 'PAID' || row.status === 'CLEARED') {
               cell.font = { bold: true, color: { argb: 'FF065F46' } }
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
            } else {
               cell.font = { bold: true, color: { argb: 'FFB45309' } }
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
            }
         }
      })
      excelRow.height = 22
   })

   // 6. Totals Row
   const totalsRowIdx = 6 + dataRows.length
   const totalsRow = worksheet.getRow(totalsRowIdx)
   
   totalsRow.values = [
      'Total',
      '',
      { formula: `=SUM(C6:C${totalsRowIdx - 1})` },
      { formula: `=SUM(D6:D${totalsRowIdx - 1})` },
      { formula: `=SUM(E6:E${totalsRowIdx - 1})` },
      { formula: `=SUM(F6:F${totalsRowIdx - 1})` },
      '',
   ]

   totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
      cell.font = { bold: true, size: 10 }
      cell.border = { 
         top: { style: 'thin' }, 
         left: { style: 'thin' }, 
         bottom: { style: 'double' }, 
         right: { style: 'thin' } 
      }
      cell.alignment = { vertical: 'middle' }

      if (colNumber === 1) {
         cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else if (colNumber >= 3 && colNumber <= 6) {
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
         cell.numFmt = '#,##0.00'
      }
   })
   totalsRow.height = 24

   const buffer = await workbook.xlsx.writeBuffer()
   const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
   const url = URL.createObjectURL(blob)
   const link = document.createElement('a')
   link.href = url
   link.download = filename
   document.body.appendChild(link)
   link.click()
   document.body.removeChild(link)
   URL.revokeObjectURL(url)
}

async function downloadTAPerformanceWorkbook(filename: string, estateTitle: string, monthName: string, year: number, dataRows: TAPerformanceRow[]) {
   const workbook = new ExcelJS.Workbook()
   workbook.creator = 'දළුපොත'
   workbook.created = new Date()
   workbook.modified = new Date()

   const worksheet = workbook.addWorksheet('TA Performance', {
      views: [{ state: 'frozen', ySplit: 5 }],
      properties: { defaultRowHeight: 22 },
   })

   worksheet.pageSetup = {
      orientation: 'portrait',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
   }

   worksheet.columns = [
      { key: 'rank', width: 10 },
      { key: 'agentCode', width: 16 },
      { key: 'name', width: 26 },
      { key: 'totalWeight', width: 22 },
      { key: 'collectionCount', width: 16 },
      { key: 'pendingCount', width: 14 },
      { key: 'activeDays', width: 15 },
      { key: 'averageWeight', width: 22 },
   ]

   // 1. Header Banner
   worksheet.mergeCells('A1:H1')
   const titleCell = worksheet.getCell('A1')
   titleCell.value = `${estateTitle.toUpperCase()} - TA PERFORMANCE REPORT`
   titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
   titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
   titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } }
   worksheet.getRow(1).height = 30

   // 2. Sub-header / Period
   worksheet.mergeCells('A2:H2')
   const periodCell = worksheet.getCell('A2')
   periodCell.value = `Period: ${monthName} ${year}`
   periodCell.font = { bold: true, size: 10, italic: true, color: { argb: 'FF475569' } }
   periodCell.alignment = { horizontal: 'center', vertical: 'middle' }
   periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
   worksheet.getRow(2).height = 20

   // 3. Separator
   worksheet.mergeCells('A3:H3')
   worksheet.getCell('A3').value = ''

   // 4. Table Headers
   const tableHeaders = ['Rank', 'TA ID', 'TA Name', 'Total Weight (kg)', 'Collections', 'Pending', 'Active Days', 'Average Weight (kg)']
   tableHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(5, 1 + index)
      cell.value = header
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C9141' } }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } }
   })
   worksheet.getRow(5).height = 26

   // 5. Data Rows
   dataRows.forEach((row, index) => {
      const rowNumber = 6 + index
      const excelRow = worksheet.getRow(rowNumber)
      
      excelRow.values = [
         index + 1,
         row.agentCode || row.id,
         row.name,
         row.totalWeight,
         row.collectionCount,
         row.pendingCount,
         row.activeDays,
         row.averageWeight,
      ]

      const isEven = index % 2 === 0
      const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'

      excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } }
         cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
         cell.alignment = { vertical: 'middle' }
         cell.font = { size: 10 }

         if (colNumber === 1 || colNumber === 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
         } else if (colNumber === 3) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' }
         } else if (colNumber === 4 || colNumber === 8) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
            cell.numFmt = '#,##0.00'
         } else if (colNumber >= 5 && colNumber <= 7) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
            cell.numFmt = '#,##0'
            if (colNumber === 6 && row.pendingCount > 0) {
               cell.font = { bold: true, color: { argb: 'FFEE4444' } }
            }
         }
      })
      excelRow.height = 22
   })

   // 6. Totals Row
   const totalsRowIdx = 6 + dataRows.length
   const totalsRow = worksheet.getRow(totalsRowIdx)
   
   totalsRow.values = [
      'Total',
      '',
      '',
      { formula: `=SUM(D6:D${totalsRowIdx - 1})` },
      { formula: `=SUM(E6:E${totalsRowIdx - 1})` },
      { formula: `=SUM(F6:F${totalsRowIdx - 1})` },
      '',
      { formula: `=AVERAGE(H6:H${totalsRowIdx - 1})` },
   ]

   totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
      cell.font = { bold: true, size: 10 }
      cell.border = { 
         top: { style: 'thin' }, 
         left: { style: 'thin' }, 
         bottom: { style: 'double' }, 
         right: { style: 'thin' } 
      }
      cell.alignment = { vertical: 'middle' }

      if (colNumber === 1) {
         cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else if (colNumber === 4 || colNumber === 8) {
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
         cell.numFmt = '#,##0.00'
      } else if (colNumber === 5 || colNumber === 6) {
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
         cell.numFmt = '#,##0'
      }
   })
   totalsRow.height = 24

   const buffer = await workbook.xlsx.writeBuffer()
   const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
   const url = URL.createObjectURL(blob)
   const link = document.createElement('a')
   link.href = url
   link.download = filename
   document.body.appendChild(link)
   link.click()
   document.body.removeChild(link)
   URL.revokeObjectURL(url)
}

async function downloadSmallHolderRankingWorkbook(filename: string, estateTitle: string, monthName: string, year: number, dataRows: any[]) {
   const workbook = new ExcelJS.Workbook()
   workbook.creator = 'දළුපොත'
   workbook.created = new Date()
   workbook.modified = new Date()

   const worksheet = workbook.addWorksheet('Small Holder Ranking', {
      views: [{ state: 'frozen', ySplit: 5 }],
      properties: { defaultRowHeight: 22 },
   })

   worksheet.pageSetup = {
      orientation: 'portrait',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
   }

   worksheet.columns = [
      { key: 'rank', width: 10 },
      { key: 'id', width: 16 },
      { key: 'name', width: 26 },
      { key: 'total', width: 24 },
   ]

   // 1. Header Banner
   worksheet.mergeCells('A1:D1')
   const titleCell = worksheet.getCell('A1')
   titleCell.value = `${estateTitle.toUpperCase()} - SMALL HOLDER RANKING REPORT`
   titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
   titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
   titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } }
   worksheet.getRow(1).height = 30

   // 2. Sub-header / Period
   worksheet.mergeCells('A2:D2')
   const periodCell = worksheet.getCell('A2')
   periodCell.value = `Period: ${monthName} ${year}`
   periodCell.font = { bold: true, size: 10, italic: true, color: { argb: 'FF475569' } }
   periodCell.alignment = { horizontal: 'center', vertical: 'middle' }
   periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
   worksheet.getRow(2).height = 20

   // 3. Separator
   worksheet.mergeCells('A3:D3')
   worksheet.getCell('A3').value = ''

   // 4. Table Headers
   const tableHeaders = ['Rank', 'Supplier ID', 'Supplier Name', 'Total Weight (kg)']
   tableHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(5, 1 + index)
      cell.value = header
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C9141' } }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } }
   })
   worksheet.getRow(5).height = 26

   // 5. Data Rows
   dataRows.forEach((row, index) => {
      const rowNumber = 6 + index
      const excelRow = worksheet.getRow(rowNumber)
      
      excelRow.values = [
         index + 1,
         row.id,
         row.name,
         row.total,
      ]

      const isEven = index % 2 === 0
      const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'

      excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } }
         cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
         cell.alignment = { vertical: 'middle' }
         cell.font = { size: 10 }

         if (colNumber === 1 || colNumber === 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
         } else if (colNumber === 3) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' }
         } else if (colNumber === 4) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
            cell.numFmt = '#,##0.00'
         }
      })
      excelRow.height = 22
   })

   // 6. Totals Row
   const totalsRowIdx = 6 + dataRows.length
   const totalsRow = worksheet.getRow(totalsRowIdx)
   
   totalsRow.values = [
      'Total',
      '',
      '',
      { formula: `=SUM(D6:D${totalsRowIdx - 1})` },
   ]

   totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
      cell.font = { bold: true, size: 10 }
      cell.border = { 
         top: { style: 'thin' }, 
         left: { style: 'thin' }, 
         bottom: { style: 'double' }, 
         right: { style: 'thin' } 
      }
      cell.alignment = { vertical: 'middle' }

      if (colNumber === 1) {
         cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else if (colNumber === 4) {
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
         cell.numFmt = '#,##0.00'
      }
   })
   totalsRow.height = 24

   const buffer = await workbook.xlsx.writeBuffer()
   const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
   const url = URL.createObjectURL(blob)
   const link = document.createElement('a')
   link.href = url
   link.download = filename
   document.body.appendChild(link)
   link.click()
   document.body.removeChild(link)
   URL.revokeObjectURL(url)
}

async function downloadInventoryStockWorkbook(filename: string, estateTitle: string, monthName: string, year: number, dataRows: InventoryItem[]) {
   const workbook = new ExcelJS.Workbook()
   workbook.creator = 'දළුපොත'
   workbook.created = new Date()
   workbook.modified = new Date()

   const worksheet = workbook.addWorksheet('Inventory Stock', {
      views: [{ state: 'frozen', ySplit: 5 }],
      properties: { defaultRowHeight: 22 },
   })

   worksheet.pageSetup = {
      orientation: 'portrait',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
   }

   worksheet.columns = [
      { key: 'category', width: 22 },
      { key: 'name', width: 30 },
      { key: 'available', width: 20 },
      { key: 'reorderLevel', width: 20 },
      { key: 'unitCost', width: 18 },
      { key: 'stockValue', width: 20 },
      { key: 'status', width: 15 },
      { key: 'lastUpdated', width: 24 },
   ]

   // 1. Header Banner
   worksheet.mergeCells('A1:H1')
   const titleCell = worksheet.getCell('A1')
   titleCell.value = `${estateTitle.toUpperCase()} - INVENTORY STOCK REPORT`
   titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
   titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
   titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6A4F' } }
   worksheet.getRow(1).height = 30

   // 2. Sub-header / Period
   worksheet.mergeCells('A2:H2')
   const periodCell = worksheet.getCell('A2')
   periodCell.value = `As of: ${monthName} ${year}`
   periodCell.font = { bold: true, size: 10, italic: true, color: { argb: 'FF475569' } }
   periodCell.alignment = { horizontal: 'center', vertical: 'middle' }
   periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
   worksheet.getRow(2).height = 20

   // 3. Separator
   worksheet.mergeCells('A3:H3')
   worksheet.getCell('A3').value = ''

   // 4. Table Headers
   const tableHeaders = ['Category', 'Item Name', 'Available Stock', 'Reorder Level', 'Unit Cost (Rs)', 'Stock Value (Rs)', 'Status', 'Last Updated']
   tableHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(5, 1 + index)
      cell.value = header
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C9141' } }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } }
   })
   worksheet.getRow(5).height = 26

   // 5. Data Rows
   dataRows.forEach((row, index) => {
      const rowNumber = 6 + index
      const excelRow = worksheet.getRow(rowNumber)
      
      const categoryLabel = getInventoryCategoryLabel(row.itemCategory, (k: string) => k)
      const isLow = isLowStock(row)
      const statusText = isLow ? 'Low Stock' : 'OK'
      const formattedDate = row.lastUpdated ? new Date(row.lastUpdated).toLocaleString() : ''
      const availableStr = `${row.quantityInStock} ${row.unit}`
      const reorderStr = `${row.reorderLevel} ${row.unit}`
      const stockVal = Number(row.quantityInStock || 0) * Number(row.unitCost || 0)
      
      excelRow.values = [
         categoryLabel,
         row.itemName,
         availableStr,
         reorderStr,
         row.unitCost,
         stockVal,
         statusText,
         formattedDate,
      ]

      const isEven = index % 2 === 0
      const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'

      excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
         cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } }
         cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
         cell.alignment = { vertical: 'middle' }
         cell.font = { size: 10 }

         if (colNumber === 1 || colNumber === 2) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' }
         } else if (colNumber === 3 || colNumber === 4) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
         } else if (colNumber === 5 || colNumber === 6) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
            cell.numFmt = '#,##0.00'
         } else if (colNumber === 7) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
            if (isLow) {
               cell.font = { bold: true, color: { argb: 'FFEE4444' } }
            } else {
               cell.font = { color: { argb: 'FF10B981' } }
            }
         } else if (colNumber === 8) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
         }
      })
      excelRow.height = 22
   })

   // 6. Totals/Summary Row (Total Valuation)
   const totalsRowIdx = 6 + dataRows.length
   const totalsRow = worksheet.getRow(totalsRowIdx)
   const totalStockValue = dataRows.reduce((sum, item) => sum + Number(item.quantityInStock || 0) * Number(item.unitCost || 0), 0)
   
   totalsRow.values = [
      'Total Valuation (Rs)',
      '',
      '',
      '',
      '',
      totalStockValue,
      '',
      ''
   ]

   worksheet.mergeCells(`A${totalsRowIdx}:E${totalsRowIdx}`)
   const mergedTotalLabelCell = worksheet.getCell(`A${totalsRowIdx}`)
   mergedTotalLabelCell.value = 'Total Inventory Valuation (Rs)'
   mergedTotalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' }

   totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
      cell.font = { bold: true, size: 10 }
      cell.border = { 
         top: { style: 'thin' }, 
         left: { style: 'thin' }, 
         bottom: { style: 'double' }, 
         right: { style: 'thin' } 
      }
      cell.alignment = { vertical: 'middle' }

      if (colNumber === 6) {
         cell.alignment = { horizontal: 'right', vertical: 'middle' }
         cell.numFmt = '#,##0.00'
      }
   })
   totalsRow.height = 24

   const buffer = await workbook.xlsx.writeBuffer()
   const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
   const url = URL.createObjectURL(blob)
   const link = document.createElement('a')
   link.href = url
   link.download = filename
   document.body.appendChild(link)
   link.click()
   document.body.removeChild(link)
   URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { t } = useLanguage()

  const [reportState, setReportState] = useState<'closed' | 'result'>('closed');
   const [reportFormat, setReportFormat] = useState<ReportFormat>('pdf');
   const [reportId, setReportId] = useState<ReportId>('small_holder_ranking');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [rankingData, setRankingData] = useState<any[]>([]);
   const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
   const [taPerformanceData, setTaPerformanceData] = useState<TAPerformanceRow[]>([]);
   const [dailyCollectionData, setDailyCollectionData] = useState<DailyCollectionRecord[]>([]);
   const [monthlyFinancialData, setMonthlyFinancialData] = useState<MonthlyFinancialRecord[]>([]);
   const [debtAgeingData, setDebtAgeingData] = useState<DebtAgeingRow[]>([]);
   const [reportError, setReportError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

   const debtAgeingHeaders = [
      'Pass Book No',
      'Leaf Route',
      'Name',
      'Previous Amount',
      'Current Amount',
      'Difference',
      '0 - 30 Days',
      '31 - 60 Days',
      '61 - 90 Days',
      '91 - 180 Days',
      'Over 180 Days',
      'Previous Quantity',
      'Current Quantity',
      'Current Remarks',
      'Previous Remarks',
      'Current Month Supply Note',
      'Recover This Month',
   ];

   const buildDebtAgeingRows = async (): Promise<DebtAgeingRow[]> => {
      const suppliers = await AuthAPI.getSuppliers({ limit: 1000 });
      const collections = await CollectionAPI.getRecentCollections(1000);
      const snapshotDate = endOfSelectedMonth(selectedMonth, selectedYear);
      const previousSnapshotDate = getPreviousMonthEnd(selectedMonth, selectedYear)

      const quantityBySupplierAndMonth = new Map<string, { current: number; previous: number }>()

      (collections || []).forEach((collection: any) => {
         const collectedAt = collection.collectedAt || collection.timestamp
         if (!collectedAt) return
         const collectedDate = new Date(collectedAt)
         if (Number.isNaN(collectedDate.getTime())) return

         const supplierKey = getSupplierKey(collection.supplierId)
         if (!supplierKey) return

         const quantity = Number(collection.netWeight || collection.grossWeight || 0)
         if (!quantityBySupplierAndMonth.has(supplierKey)) {
            quantityBySupplierAndMonth.set(supplierKey, { current: 0, previous: 0 })
         }
         const bucket = quantityBySupplierAndMonth.get(supplierKey)!
         if (collectedDate.getMonth() + 1 === selectedMonth && collectedDate.getFullYear() === selectedYear) {
            bucket.current += quantity
         }
         const previousMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
         const previousYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
         if (collectedDate.getMonth() + 1 === previousMonth && collectedDate.getFullYear() === previousYear) {
            bucket.previous += quantity
         }
      })

      const rows = await Promise.all((suppliers || []).map(async (supplier) => {
         const [ledger, transactions] = await Promise.all([
            FinanceAPI.getSupplierLedger(supplier.supplierId),
            FinanceAPI.getLedgerTransactions(supplier.supplierId),
         ]);

         const currentSnapshot = calculateDebtSnapshot(transactions || [], snapshotDate);
         const previousSnapshot = calculateDebtSnapshot(transactions || [], previousSnapshotDate);
         const currentAmount = Number(ledger?.currentDebt ?? currentSnapshot.totalOutstanding ?? 0);
         const previousAmount = Number(previousSnapshot.totalOutstanding ?? 0);
         const difference = currentAmount - previousAmount;

         const monthlyQuantities = quantityBySupplierAndMonth.get(getSupplierKey(supplier.supplierId)) || { current: 0, previous: 0 };
         const remarks = getDebtRemark(monthlyQuantities.current, monthlyQuantities.previous, currentAmount, previousAmount)

         return {
            supplierId: supplier.supplierId,
            passBookNo: supplier.passbookNo || '',
            leafRoute: supplier.landName || '',
            name: supplier.fullName || '',
            previousAmount,
            currentAmount,
            difference,
            previousAge0to30: previousSnapshot.age0to30,
            previousAge31to60: previousSnapshot.age31to60,
            previousAge61to90: previousSnapshot.age61to90,
            previousAge91to180: previousSnapshot.age91to180,
            previousAgeOver180: previousSnapshot.ageOver180,
            age0to30: currentSnapshot.age0to30,
            age31to60: currentSnapshot.age31to60,
            age61to90: currentSnapshot.age61to90,
            age91to180: currentSnapshot.age91to180,
            ageOver180: currentSnapshot.ageOver180,
            quantityPrevious: monthlyQuantities.previous,
            quantityCurrent: monthlyQuantities.current,
            remarks,
         };
      }));

      return rows.sort((a, b) => a.passBookNo.localeCompare(b.passBookNo));
   };

   const generateReportForTile = (id: ReportId, format: ReportFormat) => {
    setReportId(id);
    setReportFormat(format);
      void handleGenerateReport(id, format);
  };

  const getReportTitle = () => {
     switch(reportId) {
        case 'daily_collection': return t("Daily Collection Report");
        case 'monthly_financial': return t("Monthly Financial Report");
        case 'inventory_stock': return t("Inventory Stock Report");
        case 'ta_performance': return t("TA Performance Report");
        case 'small_holder_ranking': return t("Small Holder Supply Ranking");
        case 'debt_ageing': return t("Debt Ageing Report");
        default: return "";
     }
  };

   const handleGenerateReport = async (id: ReportId, format: ReportFormat) => {
      if (id === 'daily_collection') {
         await generateDailyCollectionReport(format);
      } else if (id === 'monthly_financial') {
         await generateMonthlyFinancialReport(format);
      } else if (id === 'small_holder_ranking') {
      await generateSmallHolderRanking(format);
      } else if (id === 'inventory_stock') {
         await generateInventoryStockReport(format);
      } else if (id === 'ta_performance') {
         await generateTAPerformanceReport(format);
      } else if (id === 'debt_ageing') {
         await generateDebtAgeingReport(format);
    } else {
      setIsLoading(true);
      setReportState('result');
      setTimeout(() => {
        setIsLoading(false);
        if (format === 'excel') {
           const csvContent = "data:text/csv;charset=utf-8,Mock Data\n(Export logic under construction)";
           const encodedUri = encodeURI(csvContent);
           const link = document.createElement("a");
           link.setAttribute("href", encodedUri);
           link.setAttribute("download", `${id}_${selectedYear}_${selectedMonth}.csv`);
           document.body.appendChild(link);
           link.click();
           document.body.removeChild(link);
           setReportState('closed');
        }
      }, 1000);
    }
  };

   const generateDebtAgeingReport = async (format: ReportFormat) => {
      setIsLoading(true);
      setReportState('result');
      setReportError(null);

      try {
         const rows = await buildDebtAgeingRows();
         setDebtAgeingData(rows);

         if (format === 'excel') {
            const currentDate = new Date(selectedYear, selectedMonth - 1, 1)
            const previousDate = selectedMonth === 1 ? new Date(selectedYear - 1, 11, 1) : new Date(selectedYear, selectedMonth - 2, 1)
            const summaryRows = [
               {
                  label: getMonthTitle(currentDate),
                  current: rows.reduce((acc, row) => ({
                     totalOutstanding: acc.totalOutstanding + row.currentAmount,
                     age0to30: acc.age0to30 + row.age0to30,
                     age31to60: acc.age31to60 + row.age31to60,
                     age61to90: acc.age61to90 + row.age61to90,
                     age91to180: acc.age91to180 + row.age91to180,
                     ageOver180: acc.ageOver180 + row.ageOver180,
                  }), emptyDebtSnapshot()),
                  previous: rows.reduce((acc, row) => ({
                     totalOutstanding: acc.totalOutstanding + row.previousAmount,
                     age0to30: acc.age0to30 + row.previousAge0to30,
                     age31to60: acc.age31to60 + row.previousAge31to60,
                     age61to90: acc.age61to90 + row.previousAge61to90,
                     age91to180: acc.age91to180 + row.previousAge91to180,
                     ageOver180: acc.ageOver180 + row.previousAgeOver180,
                  }), emptyDebtSnapshot()),
               },
               {
                  label: getMonthTitle(previousDate),
                  current: rows.reduce((acc, row) => ({
                     totalOutstanding: acc.totalOutstanding + row.previousAmount,
                     age0to30: acc.age0to30 + row.previousAge0to30,
                     age31to60: acc.age31to60 + row.previousAge31to60,
                     age61to90: acc.age61to90 + row.previousAge61to90,
                     age91to180: acc.age91to180 + row.previousAge91to180,
                     ageOver180: acc.ageOver180 + row.previousAgeOver180,
                  }), emptyDebtSnapshot()),
                  previous: emptyDebtSnapshot(),
               },
               {
                  label: 'Variance',
                  current: rows.reduce((acc, row) => ({
                     totalOutstanding: acc.totalOutstanding + row.currentAmount,
                     age0to30: acc.age0to30 + row.age0to30,
                     age31to60: acc.age31to60 + row.age31to60,
                     age61to90: acc.age61to90 + row.age61to90,
                     age91to180: acc.age91to180 + row.age91to180,
                     ageOver180: acc.ageOver180 + row.ageOver180,
                  }), emptyDebtSnapshot()),
                  previous: rows.reduce((acc, row) => ({
                     totalOutstanding: acc.totalOutstanding + row.previousAmount,
                     age0to30: acc.age0to30 + row.previousAge0to30,
                     age31to60: acc.age31to60 + row.previousAge31to60,
                     age61to90: acc.age61to90 + row.previousAge61to90,
                     age91to180: acc.age91to180 + row.previousAge91to180,
                     ageOver180: acc.ageOver180 + row.previousAgeOver180,
                  }), emptyDebtSnapshot()),
               },
            ]

            await downloadDebtAgeingWorkbook(
               `debt_ageing_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`,
               sessionStorage.getItem('estate_name') || t('Debt Ageing Report'),
               summaryRows,
               rows,
               currentDate,
               previousDate,
            )
            setReportState('closed');
         }
      } catch (e) {
         console.error(e);
         setReportError(t('Failed to load debt ageing data. Please try again.'));
      } finally {
         setIsLoading(false);
      }
   };

   const generateInventoryStockReport = async (format: ReportFormat) => {
      setIsLoading(true);
      setReportState('result');
      setReportError(null);

      try {
         const items = await InventoryAPI.getItems();
         const sorted = [...items].sort((a, b) => {
            const lowStockA = isLowStock(a) ? 0 : 1;
            const lowStockB = isLowStock(b) ? 0 : 1;
            if (lowStockA !== lowStockB) return lowStockA - lowStockB;
            if (a.itemCategory !== b.itemCategory) return a.itemCategory.localeCompare(b.itemCategory);
            return a.itemName.localeCompare(b.itemName);
         });

         setInventoryData(sorted);

         if (format === 'excel') {
            const filename = `inventory_stock_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`;
            const estateTitle = sessionStorage.getItem('estate_name') || 'Dalupotha Estate';
            const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' });
            await downloadInventoryStockWorkbook(
               filename,
               estateTitle,
               monthName,
               selectedYear,
               sorted
            );
            setReportState('closed');
         }
      } catch (e) {
         console.error(e);
         setReportError(t('Failed to load inventory data. Please try again.'));
      } finally {
         setIsLoading(false);
      }
   };

   const generateTAPerformanceReport = async (format: ReportFormat) => {
      setIsLoading(true);
      setReportState('result');
      setReportError(null);

      try {
         const collections = await CollectionAPI.getRecentCollections(1000);
         const filteredCollections = (collections || []).filter((collection: any) => {
            const collectedAt = collection.collectedAt || collection.timestamp;
            // Exclude records without a collection date or without a registered agent id
            if (!collectedAt || !collection.transportAgentId) return false;
            const date = new Date(collectedAt);
            return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
         });

         const performanceMap: Record<string, TAPerformanceRow & { activeDaySet: Set<string> }> = {};

         filteredCollections.forEach((collection: any) => {
            const agentName = collection.transportAgentName || collection.agentName || 'Transport Agent';
            const agentId = collection.transportAgentId; // guaranteed present by filter above
            const key = agentId;
            const weight = Number(collection.netWeight || collection.grossWeight || 0);
            const collectedAt = collection.collectedAt || collection.timestamp;
            const dayKey = collectedAt ? new Date(collectedAt).toISOString().split('T')[0] : '';

            if (!performanceMap[key]) {
               performanceMap[key] = {
                  id: agentId,
                  name: agentName,
                  agentCode: agentId,
                  totalWeight: 0,
                  collectionCount: 0,
                  pendingCount: 0,
                  activeDays: 0,
                  averageWeight: 0,
                  activeDaySet: new Set<string>(),
               };
            }

            performanceMap[key].totalWeight += weight;
            performanceMap[key].collectionCount += 1;
            if (collection.netWeight === null || collection.netWeight === undefined) {
               performanceMap[key].pendingCount += 1;
            }
            if (dayKey) {
               performanceMap[key].activeDaySet.add(dayKey);
            }
         });

         // Resolve agent names by fetching each agent's detailed profile
         const agentIds = Object.keys(performanceMap);
         const idToName: Record<string,string> = {};
         const idToAgentCode: Record<string,string> = {};
         await Promise.all(agentIds.map(async (aid) => {
            try {
               const user = await AuthAPI.getDetailedUser(aid);
               idToName[aid] = user?.name || user?.fullName || '';
               idToAgentCode[aid] = user?.id || aid;
            } catch (e) {
               // fallback handled later
            }
         }));

         const sorted = Object.values(performanceMap)
            .map(({ activeDaySet, ...row }) => ({
               ...row,
               // Resolve the display name and the human-readable agent id if available
               name: idToName[row.id] || row.name,
               agentCode: idToAgentCode[row.id] || row.agentCode,
               activeDays: activeDaySet.size,
               averageWeight: row.collectionCount > 0 ? row.totalWeight / row.collectionCount : 0,
            }))
            .filter(row => idToName[row.id] && idToName[row.id].trim() !== '') // Remove agents that couldn't be resolved
            .sort((a, b) => b.totalWeight - a.totalWeight || b.collectionCount - a.collectionCount);

         setTaPerformanceData(sorted);

         if (format === 'excel') {
            const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' });
            const estateTitle = sessionStorage.getItem('estate_name') || 'Dalupotha Estate';
            await downloadTAPerformanceWorkbook(
               `ta_performance_${selectedYear}_${selectedMonth}.xlsx`,
               estateTitle,
               monthName,
               selectedYear,
               sorted
            );
            setReportState('closed');
         }
      } catch (e) {
         console.error(e);
         setReportError(t('Failed to load TA performance data. Please try again.'));
      } finally {
         setIsLoading(false);
      }
   };

   const generateDailyCollectionReport = async (format: ReportFormat) => {
      setIsLoading(true);
      setReportState('result');
      setReportError(null);

      try {
         const collections = await CollectionAPI.getRecentCollections(1000);
         
         // Group collections by date for selected month/year
         const dailyMap: Record<string, DailyCollectionRecord> = {};
         
         (collections || []).forEach((collection: any) => {
            const collectedAt = collection.collectedAt || collection.timestamp;
            if (!collectedAt) return;
            
            const date = new Date(collectedAt);
            if ((date.getMonth() + 1) !== selectedMonth || date.getFullYear() !== selectedYear) return;
            
            const dateStr = date.toISOString().split('T')[0];
            
            if (!dailyMap[dateStr]) {
               dailyMap[dateStr] = {
                  date: dateStr,
                  collectionCount: 0,
                  grossWeight: 0,
                  netWeight: 0,
                  uniqueSuppliers: new Set<string>(),
                  pendingCount: 0,
               } as any;
            }
            
            const gross = Number(collection.grossWeight || 0);
            const net = Number(collection.netWeight || 0);
            
            dailyMap[dateStr].collectionCount += 1;
            dailyMap[dateStr].grossWeight += gross;
            dailyMap[dateStr].netWeight += net;
            
            if (collection.supplierId) {
               (dailyMap[dateStr].uniqueSuppliers as any).add(collection.supplierId);
            }
            
            if (collection.netWeight === null || collection.netWeight === undefined) {
               dailyMap[dateStr].pendingCount += 1;
            }
         });
         
         const sorted = Object.values(dailyMap)
            .map(day => ({
               ...day,
               uniqueSuppliers: (day.uniqueSuppliers as any).size,
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
         
         setDailyCollectionData(sorted);
         
         if (format === 'excel') {
            const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' });
            const estateTitle = sessionStorage.getItem('estate_name') || 'Dalupotha Estate';
            await downloadDailyCollectionWorkbook(
               `daily_collection_${selectedYear}_${selectedMonth}.xlsx`,
               estateTitle,
               monthName,
               selectedYear,
               sorted
            );
            setReportState('closed');
         }
      } catch (e) {
         console.error(e);
         setReportError(t('Failed to load daily collection data. Please try again.'));
      } finally {
         setIsLoading(false);
      }
   };

   const generateMonthlyFinancialReport = async (format: ReportFormat) => {
      setIsLoading(true);
      setReportState('result');
      setReportError(null);

      try {
         // 1. Fetch Real Leaf Rate from Manager settings
         let leafPrice = 240; // Default fallback
         try {
            const priceRes = await fetch('/api/finance/leaf-price');
            if (priceRes.ok) {
               const priceData = await priceRes.json();
               if (priceData.pricePerKg) {
                  leafPrice = Number(priceData.pricePerKg);
               }
            }
         } catch (err) {
            console.error("Failed to fetch leaf price", err);
         }

         const [suppliersList, collections] = await Promise.all([
            AuthAPI.getSuppliers().catch(() => []),
            CollectionAPI.getRecentCollections(1000)
         ]);

         const passbookMap: Record<string, string> = {};
         suppliersList.forEach((s: any) => {
            if (s.supplierId) {
               passbookMap[s.supplierId] = s.passbookNo;
            }
         });
         
         // Group by supplier and calculate gross collection amount
         const financialMap: Record<string, MonthlyFinancialRecord> = {};
         
         (collections || []).forEach((collection: any) => {
            const collectedAt = collection.collectedAt || collection.timestamp;
            if (!collectedAt) return;
            
            const date = new Date(collectedAt);
            if ((date.getMonth() + 1) !== selectedMonth || date.getFullYear() !== selectedYear) return;
            
            const supplierId = collection.supplierId || 'UNKNOWN';
            const weight = Number(collection.netWeight || collection.grossWeight || 0);
            const calculatedAmount = weight * leafPrice;
            
            if (!financialMap[supplierId]) {
               financialMap[supplierId] = {
                  supplierId: supplierId,
                  supplierName: collection.supplierName || 'Unknown Supplier',
                  passbookNo: collection.passbookNo || passbookMap[supplierId] || 'No Passbook',
                  gross: 0,
                  adv: 0,
                  debt: 0,
                  netPay: 0,
                  status: 'PENDING',
                  totalAmount: 0,
                  payoutAmount: 0,
                  pendingAmount: 0,
                  transactionCount: 0,
               };
            }
            
            financialMap[supplierId].gross += calculatedAmount;
            financialMap[supplierId].totalAmount += calculatedAmount;
            financialMap[supplierId].transactionCount += 1;
         });

         // 2. Fetch real ledger and transactions for each supplier to calculate payouts
         const supplierIds = Object.keys(financialMap);
         await Promise.all(supplierIds.map(async (supplierId) => {
            if (supplierId === 'UNKNOWN') return;
            try {
               const [ledger, transactions] = await Promise.all([
                  FinanceAPI.getSupplierLedger(supplierId).catch(() => ({ advanceTaken: 0, currentDebt: 0 })),
                  FinanceAPI.getLedgerTransactions(supplierId).catch(() => [])
               ]);
               
               const adv = ledger.advanceTaken || 0;
               const debt = ledger.currentDebt || 0;
               
               // Verify transaction status matching Financials.tsx
               const hasPaidPayout = transactions.find((tx: any) => {
                  if (tx.transactionType !== 'PAYOUT' || !['APPROVED', 'PAID', 'CLEARED'].includes(tx.status)) return false;
                  const txDate = new Date(tx.createdAt || tx.date || tx.timestamp || tx.transactionDate);
                  return (txDate.getMonth() + 1) === selectedMonth && txDate.getFullYear() === selectedYear;
               });
               
               const pendingPayout = transactions.find((tx: any) => {
                  if (tx.transactionType !== 'PAYOUT' || tx.status !== 'AWAITING_APPROVAL') return false;
                  const txDate = new Date(tx.createdAt || tx.date || tx.timestamp || tx.transactionDate);
                  return (txDate.getMonth() + 1) === selectedMonth && txDate.getFullYear() === selectedYear;
               });
               
               const status = pendingPayout ? 'AWAITING_APPROVAL' : (hasPaidPayout ? 'APPROVED' : 'PENDING');
               
               financialMap[supplierId].adv = adv;
               financialMap[supplierId].debt = debt;
               financialMap[supplierId].status = status;
               financialMap[supplierId].netPay = financialMap[supplierId].gross - (adv + debt);
               
               // Populate legacy fallback values just in case
               financialMap[supplierId].payoutAmount = hasPaidPayout ? Number(hasPaidPayout.amount || 0) : 0;
               financialMap[supplierId].pendingAmount = Math.max(0, financialMap[supplierId].netPay);
            } catch (err) {
               console.error(`Failed to fetch transactions for supplier ${supplierId}`, err);
            }
         }));
         
         const sorted = Object.values(financialMap)
            .sort((a, b) => b.gross - a.gross);
         
         setMonthlyFinancialData(sorted);
         
         if (format === 'excel') {
            const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' });
            const estateTitle = sessionStorage.getItem('estate_name') || 'Dalupotha Estate';
            await downloadMonthlyFinancialWorkbook(
               `monthly_financial_${selectedYear}_${selectedMonth}.xlsx`,
               estateTitle,
               monthName,
               selectedYear,
               sorted
            );
            setReportState('closed');
         }
         

      } catch (e) {
         console.error(e);
         setReportError(t('Failed to load monthly financial data. Please try again.'));
      } finally {
         setIsLoading(false);
      }
   };

   const generateSmallHolderRanking = async (format: ReportFormat) => {
    setIsLoading(true);
    setReportState('result');
      setReportError(null);
    try {
      // Fetch suppliers list and collections in parallel to resolve passbook numbers
      const [suppliersList, collections] = await Promise.all([
         AuthAPI.getSuppliers().catch(() => []),
         CollectionAPI.getRecentCollections(1000)
      ]);

      const passbookMap: Record<string, string> = {};
      suppliersList.forEach((s: any) => {
         if (s.supplierId) {
            passbookMap[s.supplierId] = s.passbookNo;
         }
      });
      
      const supplierTotals: Record<string, { id: string, name: string, total: number }> = {};
      
      if (collections && collections.length > 0) {
        // Filter strictly by the selected period
        const filteredCollections = collections.filter((c: any) => {
           if (!c.collectedAt) return false;
           const date = new Date(c.collectedAt);
           return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
        });

        filteredCollections.forEach((c: any) => {
          const supplierId = c.supplierId || 'UNKNOWN';
          const cleanId = c.passbookNo || passbookMap[supplierId] || 'No Passbook';
              
          const key = cleanId;
          
          if (!supplierTotals[key]) {
             supplierTotals[key] = { id: cleanId, name: c.supplierName || 'Unknown Supplier', total: 0 };
          }
          supplierTotals[key].total += (c.netWeight || c.grossWeight || 0);
        });
      }

      const sorted = Object.values(supplierTotals).sort((a, b) => b.total - a.total);
      setRankingData(sorted);
      
      if (format === 'excel') {
         const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' });
         const estateTitle = sessionStorage.getItem('estate_name') || 'Dalupotha Estate';
         await downloadSmallHolderRankingWorkbook(
            `small_holder_ranking_${selectedYear}_${selectedMonth}.xlsx`,
            estateTitle,
            monthName,
            selectedYear,
            sorted
         );
         setReportState('closed');
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const auditLogs = [
    { time: '13:02', user: 'A. MG-001', action: t('Approved Advance'), target: 'REQ-008 • SH-0022', status: 'Success' },
    { time: '12:56', user: 'A. MG-001', action: t('Viewed Reports'), target: 'REG-001 • SH-1042', status: 'Info' },
    { time: '12:45', user: 'A. SYS', action: t('Automated Sync'), target: 'Cloud Ledger', status: 'Success' },
    { time: '11:13', user: 'A. MG-002', action: t('Rejected Request'), target: 'REQ-007 • SH-0533', status: 'Warning' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="bg-gradient-to-br from-red-50 via-rose-50 to-red-50 p-8 rounded-[2rem] border border-red-100 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
          <div>
             <h1 className="text-2xl font-bold text-red-950">{t('Reports & Analytics')}</h1>
             <p className="text-red-900/80 text-sm font-medium mt-1">{t('Select a period to generate system audits and data exports')}</p>
          </div>
          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm p-2.5 rounded-2xl border border-white shadow-sm">
             <div className="hidden sm:block px-2 border-r border-red-200/60">
                <span className="text-[10px] font-black text-red-800 uppercase tracking-widest">{t('Report Period')}</span>
             </div>
             <div>
                <select 
                   className="bg-white/90 border-0 text-slate-900 text-sm font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-400 outline-none cursor-pointer shadow-sm hover:bg-white transition-colors"
                   value={selectedMonth}
                   onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                   {Array.from({ length: 12 }).map((_, i) => (
                     <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en-US', { month: 'long' })}</option>
                   ))}
                </select>
             </div>
             <div>
                <select 
                   className="bg-white/90 border-0 text-slate-900 text-sm font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-400 outline-none cursor-pointer shadow-sm hover:bg-white transition-colors"
                   value={selectedYear}
                   onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                   {Array.from({ length: new Date().getFullYear() - 2024 + 1 }, (_, i) => 2024 + i).map(y => (
                     <option key={y} value={y}>{y}</option>
                   ))}
                </select>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ReportTile 
              icon={<FileText className="text-green-500"/>} 
              label={t("Daily Collection Report")} 
              t={t} 
              onPdfClick={() => generateReportForTile('daily_collection', 'pdf')}
              onExcelClick={() => generateReportForTile('daily_collection', 'excel')}
            />
            <ReportTile 
              icon={<TrendingUp className="text-blue-500"/>} 
              label={t("Monthly Financial Report")} 
              t={t} 
              onPdfClick={() => generateReportForTile('monthly_financial', 'pdf')}
              onExcelClick={() => generateReportForTile('monthly_financial', 'excel')}
            />
            <ReportTile 
              icon={<Package className="text-orange-500"/>} 
              label={t("Inventory Stock Report")} 
              t={t} 
              onPdfClick={() => generateReportForTile('inventory_stock', 'pdf')}
              onExcelClick={() => generateReportForTile('inventory_stock', 'excel')}
            />
                  <ReportTile 
                     icon={<TrendingUp className="text-purple-500"/>} 
              label={t("TA Performance Report")} 
              t={t} 
              onPdfClick={() => generateReportForTile('ta_performance', 'pdf')}
              onExcelClick={() => generateReportForTile('ta_performance', 'excel')}
            />
            <ReportTile 
              icon={<Users className="text-red-500"/>} 
              label={t("Small Holder Supply Ranking")} 
              t={t} 
              onPdfClick={() => generateReportForTile('small_holder_ranking', 'pdf')}
              onExcelClick={() => generateReportForTile('small_holder_ranking', 'excel')}
            />
            <ReportTile 
              icon={<FileText className="text-slate-950"/>} 
              label={t("Debt Ageing Report")} 
              t={t} 
              onPdfClick={() => generateReportForTile('debt_ageing', 'pdf')}
              onExcelClick={() => generateReportForTile('debt_ageing', 'excel')}
            />
        </div>
      </div>

      <section>
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4">{t('System Audit Log')}</h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50 border-b border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-8 py-4">{t('TIME')}</th>
                    <th className="px-8 py-4">{t('USER')}</th>
                    <th className="px-8 py-4">{t('ACTION')}</th>
                    <th className="px-8 py-4">{t('TARGET ENTITY')}</th>
                    <th className="px-8 py-4">{t('STATUS')}</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {auditLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-8 py-5 text-sm font-bold text-slate-900">{log.time}</td>
                       <td className="px-8 py-5 text-sm font-bold text-slate-600 uppercase tracking-tighter">{log.user}</td>
                       <td className="px-8 py-5 text-sm font-medium text-slate-900">{log.action}</td>
                       <td className="px-8 py-5 text-xs font-mono font-bold text-slate-900">{log.target}</td>
                       <td className="px-8 py-5">
                          <span className={`flex items-center gap-1.5 text-[10px] font-bold ${
                             log.status === 'Success' ? 'text-green-500' :
                             log.status === 'Warning' ? 'text-orange-500' : 'text-blue-500'
                          }`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${
                                log.status === 'Success' ? 'bg-green-500' :
                                log.status === 'Warning' ? 'bg-orange-500' : 'bg-blue-500'
                             }`} />
                             {t(log.status).toUpperCase()}
                          </span>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
           <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button className="text-[10px] font-black text-[#2d6a4f] uppercase tracking-widest hover:text-[#1b4332]">{t('View Full Audit Log →')}</button>
           </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-60">
         <StatusBadge label={t("Database")} status="99.98% uptime" color="bg-green-500" />
         <StatusBadge label={t("Cloud Sync")} status="Last backup: 13:00 today" color="bg-green-500" />
         <StatusBadge label={t("Ginum Ledger")} status="Synced: 13:00 PM" color="bg-green-500" />
         <StatusBadge label={t("BLE Gateway")} status="1 device offline" color="bg-orange-500" />
      </section>

      {reportState !== 'closed' && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 print-modal-wrapper">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[80vh] print-modal-content">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${reportId === 'daily_collection' ? 'bg-green-100' : reportId === 'monthly_financial' ? 'bg-blue-100' : reportId === 'small_holder_ranking' ? 'bg-red-100' : reportId === 'inventory_stock' ? 'bg-orange-100' : reportId === 'ta_performance' ? 'bg-purple-100' : 'bg-slate-200'}`}>
                            {reportId === 'daily_collection' ? <FileText size={20} className="text-green-600" /> : reportId === 'monthly_financial' ? <TrendingUp size={20} className="text-blue-600" /> : reportId === 'small_holder_ranking' ? <Users size={20} className="text-red-600" /> : reportId === 'inventory_stock' ? <Package size={20} className="text-orange-600" /> : reportId === 'ta_performance' ? <TrendingUp size={20} className="text-purple-600" /> : <FileText size={20} className="text-slate-600" />}
                 </div>
                 <div>
                    <h2 className="text-lg font-bold text-slate-800">{getReportTitle()}</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {`${t('Generated report for')} ${new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' })} ${selectedYear}`}
                    </p>
                 </div>
              </div>
              <div className="flex items-center gap-2 no-print">
                 <button 
                    onClick={() => window.print()} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2d6a4f] text-white hover:bg-[#1b4332] text-xs font-black uppercase tracking-widest transition-colors shadow-sm"
                 >
                    <FileText size={14} />
                    {t('Print / PDF')}
                 </button>
                 <button onClick={() => setReportState('closed')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-900 transition-colors">
                    <X size={20} />
                 </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
               {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d6a4f]"></div>
                  </div>
               ) : reportId === 'daily_collection' ? (
                  <div className="space-y-4">
                     {reportError ? (
                        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                           {reportError}
                        </div>
                     ) : null}

                     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <InventoryMetric label={t('DAYS WITH COLLECTIONS')} value={dailyCollectionData.length.toString()} tone="slate" />
                        <InventoryMetric label={t('TOTAL COLLECTIONS')} value={dailyCollectionData.reduce((sum, day) => sum + day.collectionCount, 0).toLocaleString()} tone="emerald" />
                        <InventoryMetric label={t('TOTAL GROSS WEIGHT')} value={dailyCollectionData.reduce((sum, day) => sum + (day.grossWeight || 0), 0).toFixed(2)} tone="orange" />
                        <InventoryMetric label={t('TOTAL NET WEIGHT')} value={dailyCollectionData.reduce((sum, day) => sum + (day.netWeight || 0), 0).toFixed(2)} tone="blue" />
                        <InventoryMetric label={t('PENDING VERIFICATIONS')} value={dailyCollectionData.reduce((sum, day) => sum + day.pendingCount, 0).toString()} tone="rose" />
                     </div>

                     <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                 <th className="px-6 py-3">{t('Date')}</th>
                                 <th className="px-6 py-3 text-right">{t('Collections')}</th>
                                 <th className="px-6 py-3 text-right">{t('Gross Weight (kg)')}</th>
                                 <th className="px-6 py-3 text-right">{t('Net Weight (kg)')}</th>
                                 <th className="px-6 py-3 text-right">{t('Suppliers')}</th>
                                 <th className="px-6 py-3 text-right">{t('Pending')}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {dailyCollectionData.map((day) => (
                                 <tr key={day.date} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4">
                                       <p className="font-bold text-slate-900 text-sm">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className="font-bold text-slate-900">{day.collectionCount}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className="font-bold text-slate-900">{(day.grossWeight || 0).toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className="font-bold text-slate-900">{(day.netWeight || 0).toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className="font-bold text-slate-900">{day.uniqueSuppliers}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className={`font-bold ${day.pendingCount > 0 ? 'text-orange-600' : 'text-slate-900'}`}>{day.pendingCount}</span>
                                    </td>
                                 </tr>
                              ))}
                              {dailyCollectionData.length === 0 && (
                                 <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-500 text-sm font-medium">
                                       {t('No collection data available for selected period.')}
                                    </td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>

                     <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 no-print">
                        <FileText size={16} className="mt-0.5 shrink-0" />
                        <p className="font-medium">{t('This report shows daily collection activity including collection count, total weight, unique suppliers, and pending verifications.')}</p>
                     </div>
                  </div>
               ) : reportId === 'monthly_financial' ? (
                  <div className="space-y-4">
                     {reportError ? (
                        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                           {reportError}
                        </div>
                     ) : null}

                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <InventoryMetric label={t('SUPPLIERS')} value={monthlyFinancialData.length.toString()} tone="slate" />
                        <InventoryMetric label={t('TOTAL GROSS')} value={`Rs. ${monthlyFinancialData.reduce((sum, r) => sum + r.gross, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} tone="emerald" />
                        <InventoryMetric label={t('TOTAL DEDUCTIONS')} value={`Rs. ${monthlyFinancialData.reduce((sum, r) => sum + (r.adv + r.debt), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} tone="rose" />
                        <InventoryMetric label={t('TOTAL NET PAY')} value={`Rs. ${monthlyFinancialData.reduce((sum, r) => sum + r.netPay, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} tone="blue" />
                     </div>

                     <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                 <th className="px-6 py-3">{t('Supplier')}</th>
                                 <th className="px-6 py-3 text-right">{t('Gross (Rs.)')}</th>
                                 <th className="px-6 py-3 text-right">{t('Advance Ded.')}</th>
                                 <th className="px-6 py-3 text-right">{t('Debt Ded.')}</th>
                                 <th className="px-6 py-3 text-right">{t('Net Pay')}</th>
                                 <th className="px-6 py-3 text-center">{t('Status')}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {monthlyFinancialData.map((record) => (
                                 <tr key={record.supplierId} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4">
                                       <p className="font-bold text-slate-900 text-sm">{record.supplierName}</p>
                                       <p className="text-xs font-mono text-slate-500">{record.passbookNo}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                                       Rs. {record.gross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-rose-600 font-medium">
                                       {record.adv > 0 ? `-Rs. ${record.adv.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : 'Rs. 0'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-rose-600 font-medium">
                                       {record.debt > 0 ? `-Rs. ${record.debt.toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : 'Rs. 0'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className={`font-bold ${record.netPay < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                          Rs. {record.netPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider ${
                                          record.status === 'APPROVED' || record.status === 'PAID' || record.status === 'CLEARED'
                                             ? 'bg-[#D1FAE5] text-[#065F46]'
                                             : 'bg-[#FEF3C7] text-[#B45309]'
                                       }`}>
                                          {t(record.status)}
                                       </span>
                                    </td>
                                 </tr>
                              ))}
                              {monthlyFinancialData.length === 0 && (
                                 <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-500 text-sm font-medium">
                                       {t('No financial data available for selected period.')}
                                    </td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>

                     <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 no-print">
                        <TrendingUp size={16} className="mt-0.5 shrink-0" />
                        <p className="font-medium">{t('This report shows financial transactions by supplier including total amounts, payouts, and pending payments.')}</p>
                     </div>
                  </div>
               ) : reportId === 'small_holder_ranking' ? (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              <th className="px-6 py-3">{t('Rank')}</th>
                              <th className="px-6 py-3">{t('Supplier')}</th>
                              <th className="px-6 py-3 text-right">{t('Total Volume')}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {rankingData.map((supplier, idx) => (
                              <tr key={supplier.id} className="hover:bg-slate-50/50">
                                 <td className="px-6 py-4">
                                    {idx < 3 ? (
                                       <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>
                                          <Trophy size={14} className="mr-1 hidden sm:block"/> #{idx + 1}
                                       </div>
                                    ) : (
                                       <span className="font-bold text-slate-400 pl-3">#{idx + 1}</span>
                                    )}
                                 </td>
                                 <td className="px-6 py-4">
                                    <p className="font-bold text-slate-900 text-sm">{supplier.name}</p>
                                    <p className="text-xs font-mono text-slate-500">{supplier.id}</p>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <span className="font-bold text-slate-900">{supplier.total.toFixed(2)}</span>
                                    <span className="text-xs text-slate-500 ml-1">kg</span>
                                 </td>
                              </tr>
                           ))}
                           {rankingData.length === 0 && (
                              <tr><td colSpan={3} className="text-center py-8 text-slate-500 text-sm font-medium">{t('No collection data available for selected period.')}</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               ) : reportId === 'debt_ageing' ? (
                  <div className="space-y-4">
                     {reportError ? (
                        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                           {reportError}
                        </div>
                     ) : null}

                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <InventoryMetric label={t('SUPPLIERS')} value={debtAgeingData.length.toString()} tone="slate" />
                        <InventoryMetric label={t('CURRENT DEBT')} value={`Rs. ${formatMoney(debtAgeingData.reduce((sum, row) => sum + row.currentAmount, 0))}`} tone="rose" />
                        <InventoryMetric label={t('AGE 0 - 30')} value={`Rs. ${formatMoney(debtAgeingData.reduce((sum, row) => sum + row.age0to30, 0))}`} tone="emerald" />
                        <InventoryMetric label={t('OVER 180 DAYS')} value={`Rs. ${formatMoney(debtAgeingData.reduce((sum, row) => sum + row.ageOver180, 0))}`} tone="orange" />
                     </div>

                     <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="w-full text-left min-w-[1400px]">
                           <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                 <th className="px-6 py-3">{t('Pass Book No')}</th>
                                 <th className="px-6 py-3">{t('Leaf Route')}</th>
                                 <th className="px-6 py-3">{t('Name')}</th>
                                 <th className="px-6 py-3 text-right">{t(`Amount (Rs)-${getMonthLabel(new Date(selectedYear, selectedMonth - 1, 1))}`)}</th>
                                 <th className="px-6 py-3 text-right">{t(`Amount (Rs)-${getMonthLabel(selectedMonth === 1 ? new Date(selectedYear - 1, 11, 1) : new Date(selectedYear, selectedMonth - 2, 1))}`)}</th>
                                 <th className="px-6 py-3 text-right">{t('Increase/(decrease)')}</th>
                                 <th className="px-6 py-3 text-right">{t('0 - 30 Days')}</th>
                                 <th className="px-6 py-3 text-right">{t('31 - 60 Days')}</th>
                                 <th className="px-6 py-3 text-right">{t('61 - 90 Days')}</th>
                                 <th className="px-6 py-3 text-right">{t('91 - 180 Days')}</th>
                                 <th className="px-6 py-3 text-right">{t('Over 180 Days')}</th>
                                 <th className="px-6 py-3 text-right">{t(`Quantity Supplied in ${getMonthLabel(selectedMonth === 1 ? new Date(selectedYear - 1, 11, 1) : new Date(selectedYear, selectedMonth - 2, 1))}`)}</th>
                                 <th className="px-6 py-3 text-right">{t(`Quantity Supplied in ${getMonthLabel(new Date(selectedYear, selectedMonth - 1, 1))}`)}</th>
                                 <th className="px-6 py-3">{t('Remarks -')}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {debtAgeingData.map((row) => (
                                 <tr key={row.supplierId} className="hover:bg-slate-50/50" style={{ backgroundColor: '#92D050' }}>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-700">{row.leafRoute}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-700">{row.passBookNo}</td>
                                    <td className="px-6 py-4">
                                       <p className="font-bold text-slate-900 text-sm">{row.name}</p>
                                       <p className="text-xs font-mono text-slate-500">{row.supplierId.substring(0, 8)}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatMoney(row.currentAmount)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatMoney(row.previousAmount)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatMoney(row.difference)}</td>
                                    <td className="px-6 py-4 text-right text-emerald-600 font-bold">{formatMoney(row.age0to30)}</td>
                                    <td className="px-6 py-4 text-right text-emerald-600 font-bold">{formatMoney(row.age31to60)}</td>
                                    <td className="px-6 py-4 text-right text-amber-600 font-bold">{formatMoney(row.age61to90)}</td>
                                    <td className="px-6 py-4 text-right text-orange-600 font-bold">{formatMoney(row.age91to180)}</td>
                                    <td className="px-6 py-4 text-right text-rose-600 font-bold">{formatMoney(row.ageOver180)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatMoney(row.quantityPrevious)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900">{formatMoney(row.quantityCurrent)}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{row.remarks}</td>
                                 </tr>
                              ))}
                              {debtAgeingData.length === 0 && (
                                 <tr>
                                    <td colSpan={14} className="text-center py-8 text-slate-500 text-sm font-medium">
                                       {t('No debt ageing data available for selected period.')}
                                    </td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>

                     <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 no-print">
                        <FileText size={16} className="mt-0.5 shrink-0" />
                        <p className="font-medium">{t('This report groups supplier balances by age using finance ledger transactions and exports the workbook-style debt ageing summary.')}</p>
                     </div>
                  </div>
               ) : reportId === 'inventory_stock' ? (
                  <div className="space-y-4">
                     {reportError ? (
                        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                           {reportError}
                        </div>
                     ) : null}

                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <InventoryMetric label={t('ITEMS')} value={inventoryData.length.toString()} tone="slate" />
                        <InventoryMetric label={t('LOW STOCK')} value={inventoryData.filter(isLowStock).length.toString()} tone="rose" />
                        <InventoryMetric label={t('AVAILABLE UNITS')} value={inventoryData.reduce((sum, item) => sum + Number(item.quantityInStock || 0), 0).toLocaleString()} tone="emerald" />
                        <InventoryMetric label={t('STOCK VALUE')} value={formatCurrency(inventoryData.reduce((sum, item) => sum + Number(item.quantityInStock || 0) * Number(item.unitCost || 0), 0))} tone="orange" />
                     </div>

                     <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                 <th className="px-6 py-3">{t('Item')}</th>
                                 <th className="px-6 py-3">{t('Category')}</th>
                                 <th className="px-6 py-3 text-right">{t('Available')}</th>
                                 <th className="px-6 py-3 text-right">{t('Reorder Level')}</th>
                                 <th className="px-6 py-3 text-right">{t('Unit Cost')}</th>
                                 <th className="px-6 py-3 text-right">{t('Stock Value')}</th>
                                 <th className="px-6 py-3">{t('Status')}</th>
                                 <th className="px-6 py-3">{t('Last Updated')}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {inventoryData.map((item) => {
                                 const lowStock = isLowStock(item);
                                 return (
                                    <tr key={item.itemId} className="hover:bg-slate-50/50">
                                       <td className="px-6 py-4">
                                          <p className="font-bold text-slate-900 text-sm">{item.itemName}</p>
                                       </td>
                                       <td className="px-6 py-4 text-sm font-medium text-slate-700">{getInventoryCategoryLabel(item.itemCategory, t)}</td>
                                       <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{Number(item.quantityInStock || 0).toLocaleString()} {t(item.unit)}</td>
                                       <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{Number(item.reorderLevel || 0).toLocaleString()} {t(item.unit)}</td>
                                       <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{formatCurrency(Number(item.unitCost || 0))}</td>
                                       <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{formatCurrency(Number(item.quantityInStock || 0) * Number(item.unitCost || 0))}</td>
                                       <td className="px-6 py-4">
                                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${lowStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                                             <span className={`w-1.5 h-1.5 rounded-full ${lowStock ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                             {lowStock ? t('Low Stock') : t('OK')}
                                          </span>
                                       </td>
                                       <td className="px-6 py-4 text-sm text-slate-500">
                                          {item.lastUpdated ? new Date(item.lastUpdated).toLocaleString() : '-'}
                                       </td>
                                    </tr>
                                 )
                              })}
                              {!inventoryData.length && !reportError && (
                                 <tr>
                                    <td colSpan={8} className="text-center py-8 text-slate-500 text-sm font-medium">
                                       {t('No inventory items available.')}
                                    </td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>

                     <div className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800 no-print">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <p className="font-medium">{t('This snapshot reflects the current stock records from the inventory service.')}</p>
                     </div>
                  </div>
               ) : reportId === 'ta_performance' ? (
                  <div className="space-y-4">
                     {reportError ? (
                        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                           {reportError}
                        </div>
                     ) : null}

                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <InventoryMetric label={t('TRANSPORT AGENTS')} value={taPerformanceData.length.toString()} tone="slate" />
                        <InventoryMetric label={t('TOTAL COLLECTIONS')} value={taPerformanceData.reduce((sum, row) => sum + row.collectionCount, 0).toString()} tone="purple" />
                        <InventoryMetric label={t('PENDING ENTRIES')} value={taPerformanceData.reduce((sum, row) => sum + row.pendingCount, 0).toString()} tone="rose" />
                        <InventoryMetric label={t('TOTAL WEIGHT')} value={`${taPerformanceData.reduce((sum, row) => sum + row.totalWeight, 0).toFixed(2)} kg`} tone="emerald" />
                     </div>

                     <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                 <th className="px-6 py-3">{t('Rank')}</th>
                                 <th className="px-6 py-3">{t('Transport Agent')}</th>
                                 <th className="px-6 py-3 text-right">{t('Total Weight')}</th>
                                 <th className="px-6 py-3 text-right">{t('Collections')}</th>
                                 <th className="px-6 py-3 text-right">{t('Pending')}</th>
                                 <th className="px-6 py-3 text-right">{t('Active Days')}</th>
                                 <th className="px-6 py-3 text-right">{t('Average')}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {taPerformanceData.map((row, idx) => {
                                 const maxWeight = taPerformanceData[0]?.totalWeight || 1;
                                 const barWidth = Math.max(8, (row.totalWeight / maxWeight) * 100);
                                 return (
                                    <tr key={row.id} className="hover:bg-slate-50/50">
                                       <td className="px-6 py-4">
                                          {idx < 3 ? (
                                             <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>
                                                <Trophy size={14} className="mr-1 hidden sm:block" /> #{idx + 1}
                                             </div>
                                          ) : (
                                             <span className="font-bold text-slate-400 pl-3">#{idx + 1}</span>
                                          )}
                                       </td>
                                       <td className="px-6 py-4">
                                          <p className="font-bold text-slate-900 text-sm">{row.name}</p>
                                          <p className="text-xs font-mono text-slate-500">{row.agentCode || row.id}</p>
                                          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                             <div className="h-full bg-purple-500 rounded-full" style={{ width: `${barWidth}%` }} />
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{row.totalWeight.toFixed(2)} kg</td>
                                       <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{row.collectionCount}</td>
                                       <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{row.pendingCount}</td>
                                       <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{row.activeDays}</td>
                                       <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{row.averageWeight.toFixed(2)} kg</td>
                                    </tr>
                                 )
                              })}
                              {!taPerformanceData.length && !reportError && (
                                 <tr>
                                    <td colSpan={7} className="text-center py-8 text-slate-500 text-sm font-medium">
                                       {t('No transport activity available for the selected period.')}
                                    </td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>

                     <div className="flex items-start gap-3 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-800 no-print">
                        <Clock size={16} className="mt-0.5 shrink-0" />
                        <p className="font-medium">{t('This report ranks transport agents by total collected leaf weight for the selected month.')}</p>
                     </div>
                  </div>
               ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                     <FileText size={48} className="text-slate-300 mb-4" />
                     <h3 className="text-lg font-bold text-slate-800 mb-1">{t('Report Generated')}</h3>
                     <p className="text-sm text-slate-500 max-w-sm">{t('The visual preview for this specific report type is under construction.')}</p>
                     {reportFormat === 'excel' && <p className="text-xs text-slate-400 mt-4 font-medium">{t('Your CSV download should have started automatically.')}</p>}
                  </div>
               )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function InventoryMetric({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'rose' | 'emerald' | 'orange' | 'purple' | 'blue' }) {
   const toneClasses: Record<typeof tone, string> = {
      slate: 'border-slate-200 bg-slate-50 text-slate-950',
      rose: 'border-rose-100 bg-rose-50 text-rose-700',
      emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      orange: 'border-orange-100 bg-orange-50 text-orange-700',
      purple: 'border-purple-100 bg-purple-50 text-purple-700',
      blue: 'border-blue-100 bg-blue-50 text-blue-700',
   }

   return (
      <div className={`rounded-xl border px-4 py-3 ${toneClasses[tone]}`}>
         <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
         <p className="mt-1 text-lg font-bold leading-none">{value}</p>
      </div>
   )
}

function ReportTile({ icon, label, t, onPdfClick, onExcelClick }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-4 hover:shadow-md transition-all group">
       <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white transition-colors">{icon}</div>
       <p className="text-sm font-bold text-slate-700 text-center">{label}</p>
       <div className="flex gap-2 w-full mt-auto">
          <button onClick={onPdfClick} className="flex-1 flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 py-2 rounded-lg text-[10px] font-black text-slate-950 uppercase tracking-widest hover:bg-slate-100">
             <FileText size={12} />
             {t('PDF')}
          </button>
          <button onClick={onExcelClick} className="flex-1 flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 py-2 rounded-lg text-[10px] font-black text-slate-950 uppercase tracking-widest hover:bg-slate-100">
             <RefreshCw size={12} />
             {t('Excel')}
          </button>
       </div>
    </div>
  );
}

function StatusBadge({ label, status, color }: any) {
  return (
    <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
       <div className={`w-2 h-2 rounded-full ${color}`} />
       <div>
          <p className="text-[10px] font-black text-slate-900 tracking-widest uppercase mb-0.5">{label}</p>
          <p className="text-[10px] font-bold text-slate-600 italic">{status}</p>
       </div>
    </div>
  );
}
