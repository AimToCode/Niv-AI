// analytics.js — FIXED with Chart.js
import { getAnalytics } from './api.js';

const COLORS = ['#1A56DB','#c81e1e','#c27803','#057a55','#7c3aed','#0891b2','#db2777','#ea580c','#4338ca','#6b7280'];
let charts = {};

async function load() {
  const r = await getAnalytics();
  const d = r.success ? r.data : null;
  document.getElementById('m-total').textContent      = d?.total_30d?.toLocaleString('en-IN') || '—';
  document.getElementById('m-avg-time').textContent   = d?.avg_classification_time || '< 45 sec';
  document.getElementById('m-resolution').textContent = d?.resolution_rate ? d.resolution_rate+'%' : '—';
  buildCategory(d?.by_category || {Water:145,Roads:112,Electricity:98,Sanitation:87,Health:54,Police:43,Parks:32,Education:28,Transport:21,Other:15});
  buildUrgency(d?.by_urgency   || {HIGH:89,MEDIUM:234,LOW:312});
  buildDaily(d?.daily_volume   || genDays());
  buildDept(d?.dept_resolution || {'Jal Nigam':78,'PWD':62,'DISCOM':85,'Sanitation':55,'Police':90,'Health':70});
  buildHeatmap(d?.heatmap      || demoHeatmap());
}

function buildCategory(data) {
  const ctx = document.getElementById('chart-category')?.getContext('2d');
  if (!ctx) return;
  if (charts.cat) charts.cat.destroy();
  charts.cat = new Chart(ctx, {
    type:'bar',
    data:{labels:Object.keys(data), datasets:[{label:'Complaints',data:Object.values(data),backgroundColor:COLORS,borderRadius:6,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#f3f4f6'}},x:{grid:{display:false}}}}
  });
}

function buildUrgency(data) {
  const ctx = document.getElementById('chart-urgency')?.getContext('2d');
  if (!ctx) return;
  if (charts.urg) charts.urg.destroy();
  charts.urg = new Chart(ctx, {
    type:'doughnut',
    data:{labels:['High','Medium','Low'],datasets:[{data:[data.HIGH||0,data.MEDIUM||0,data.LOW||0],backgroundColor:['#c81e1e','#c27803','#057a55'],borderWidth:0,hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'bottom'}}}
  });
}

function buildDaily(arr) {
  const ctx = document.getElementById('chart-daily')?.getContext('2d');
  if (!ctx) return;
  if (charts.day) charts.day.destroy();
  charts.day = new Chart(ctx, {
    type:'line',
    data:{labels:arr.map(d=>d.date),datasets:[{label:'Complaints',data:arr.map(d=>d.count),borderColor:'#1A56DB',backgroundColor:'rgba(26,86,219,.08)',borderWidth:2.5,pointBackgroundColor:'#1A56DB',pointRadius:4,fill:true,tension:.4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#f3f4f6'}},x:{grid:{display:false}}}}
  });
}

function buildDept(data) {
  const ctx = document.getElementById('chart-dept')?.getContext('2d');
  if (!ctx) return;
  if (charts.dept) charts.dept.destroy();
  const vals = Object.values(data);
  charts.dept = new Chart(ctx, {
    type:'bar',
    data:{labels:Object.keys(data),datasets:[{label:'Resolution %',data:vals,backgroundColor:vals.map(v=>v>=70?'#057a55':v>=40?'#c27803':'#c81e1e'),borderRadius:6,borderSkipped:false}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,max:100},y:{grid:{display:false}}}}
  });
}

function buildHeatmap(rows) {
  const tb = document.getElementById('heatmap-tbody');
  if (!tb) return;
  const max = Math.max(...rows.flatMap(r=>[r.water||0,r.electricity||0,r.roads||0,r.sanitation||0,r.other||0]),1);
  const cell = v => { const l=Math.min(5,Math.round((v/max)*5)); return `<td><span class="heatmap-cell heat-${l}">${v}</span></td>`; };
  tb.innerHTML = rows.map(r=>`<tr><td><strong>${r.area}</strong><br><small style="color:#9ca3af">${r.pincode||''}</small></td>${cell(r.water||0)}${cell(r.electricity||0)}${cell(r.roads||0)}${cell(r.sanitation||0)}${cell(r.other||0)}<td><strong>${r.total||0}</strong></td></tr>`).join('');
}

function genDays() {
  const days=[];
  for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push({date:d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}),count:Math.floor(20+Math.random()*60)});}
  return days;
}

function demoHeatmap() {
  return [
    {area:'Mandideep',pincode:'462046',water:32,electricity:18,roads:24,sanitation:12,other:8,total:94},
    {area:'Bhopal Central',pincode:'462001',water:28,electricity:35,roads:19,sanitation:22,other:11,total:115},
    {area:'Habibganj',pincode:'462024',water:15,electricity:42,roads:28,sanitation:9,other:5,total:99},
    {area:'Kolar Road',pincode:'462042',water:44,electricity:12,roads:38,sanitation:18,other:7,total:119},
    {area:'Govindpura',pincode:'462023',water:19,electricity:27,roads:15,sanitation:31,other:14,total:106},
  ];
}

load();
