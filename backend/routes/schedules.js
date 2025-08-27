const express = require("express");
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');


router.post("/generate", async (req, res) => {
  const { courses = [], prefs = {} } = req.body || {};
  if (!Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: "courses[] required" });
  }

  
  
  const courseCodes = courses.map(course => {
    if (typeof course === 'string') {
      return course;
    } else if (course.subject && course.code) {
      return `${course.subject}${course.code}`;
    } else {
      return null;
    }
  }).filter(Boolean);


  try {
    const pythonScriptPath = path.join(__dirname, '../../scripts/course_scraper.py');
    

    const pythonPath = 'C:\\Users\\A\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';
    
    const pythonProcess = spawn(pythonPath, [pythonScriptPath, 'generate', ...courseCodes], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', stderr);
        return res.status(500).json({ 
          error: 'Failed to generate schedules', 
          details: stderr || 'Python script execution failed'
        });
      }
      
      try {
        const results = JSON.parse(stdout);
        
        if (!results.success) {
          return res.status(400).json({
            error: results.error || 'Schedule generation failed',
            failed_courses: results.failed_courses || []
          });
        }
        

        const schedules = results.valid_schedules.map((schedule, index) => {
          const blocks = [];
          const crns = [];
          
          schedule.courses.forEach(course => {

            if (course.lecture) {
              const lectureBlocks = createScheduleBlocks(course.lecture, course.course_code, 'LEC');
              blocks.push(...lectureBlocks);
              crns.push(course.lecture.crn);
            }
            

            if (course.lab) {
              const labBlocks = createScheduleBlocks(course.lab, course.course_code, 'LAB');
              blocks.push(...labBlocks);
              crns.push(course.lab.crn);
            }
            
            if (course.discussion) {
              const discBlocks = createScheduleBlocks(course.discussion, course.course_code, 'DIS');
              blocks.push(...discBlocks);
              crns.push(course.discussion.crn);
            }
          });
          
          return {
            crns,
            blocks,
            stats: calculateScheduleStats(blocks)
          };
        });
        
        res.json({
          count: schedules.length,
          schedules,
          total_combinations: results.total_possible_combinations || schedules.length,
          conflicting_combinations: results.conflicting_combinations_count || 0
        });
        
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        console.error('Raw output:', stdout);
        res.status(500).json({ 
          error: 'Failed to parse schedule results',
          details: parseError.message
        });
      }
    });
    
    setTimeout(() => {
      pythonProcess.kill('SIGTERM');
      if (!res.headersSent) {
        res.status(408).json({ error: 'Schedule generation timed out' });
      }
    }, 30000); 
    
  } catch (error) {
    console.error('Error calling Python script:', error);
    res.status(500).json({ 
      error: 'Failed to generate schedules',
      details: error.message
    });
  }
});

function createScheduleBlocks(section, courseCode, type) {
  const blocks = [];
  const schedule = section.schedule || 'TBA';
  const parts = schedule.split(' ');
  const days = parts[0] || 'TBA';
  const timeRange = parts.slice(1).join(' ') || 'TBA';
  
  const [startTime, endTime] = timeRange.includes(' - ') 
    ? timeRange.split(' - ') 
    : [timeRange, timeRange];
  

  if (days !== 'TBA') {
    const dayMap = { M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri' };
    for (const dayChar of days) {
      if (dayMap[dayChar]) {
        blocks.push({
          day: dayMap[dayChar],
          start: startTime || 'TBA',
          end: endTime || 'TBA',
          title: `${courseCode} ${type}`.trim(),
          crn: section.crn,
          location: section.location || 'TBA',
          instructor: section.instructors ? section.instructors.join(', ') : 'TBA'
        });
      }
    }
  }
  
  return blocks;
}

function calculateScheduleStats(blocks) {
  const fBlocks = blocks.flat();
  
  if (fBlocks.length === 0) {
    return { earliest: 'TBA', latest: 'TBA', gaps: 0, days: 0 };
  }
  
  const times = fBlocks
    .filter(block => block.start !== 'TBA' && block.end !== 'TBA')
    .map(block => ({
      start: timeToMinutes(block.start),
      end: timeToMinutes(block.end)
    }))
    .filter(time => time.start !== -1 && time.end !== -1);
  
  if (times.length === 0) {
    return { earliest: 'TBA', latest: 'TBA', gaps: 0, days: 0 };
  }
  
  const startTimes = times.map(t => t.start);
  const endTimes = times.map(t => t.end);
  const earliest = Math.min(...startTimes);
  const latest = Math.max(...endTimes);
  const uniqueDays = new Set(fBlocks.map(block => block.day)).size;
  

  let totalGaps = 0;
  const byDay = {};
  
  fBlocks.forEach(block => {
    if (!byDay[block.day]) byDay[block.day] = [];
    byDay[block.day].push({
      start: timeToMinutes(block.start),
      end: timeToMinutes(block.end)
    });
  });
  
  Object.values(byDay).forEach(dayBlocks => {
    dayBlocks.sort((a, b) => a.start - b.start);
    for (let i = 1; i < dayBlocks.length; i++) {
      const gap = dayBlocks[i].start - dayBlocks[i-1].end;
      if (gap > 0) totalGaps += gap;
    }
  });
  
  return {
    earliest: minutesToTime(earliest),
    latest: minutesToTime(latest),
    gaps: totalGaps,
    days: uniqueDays
  };
}

function timeToMinutes(timeStr) {
  if (!timeStr || timeStr === 'TBA') return -1;
  
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return -1;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  if (minutes === -1) return 'TBA';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

module.exports = router;