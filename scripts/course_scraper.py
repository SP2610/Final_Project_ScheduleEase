import sys
import json
import requests
import time
import re
from bs4 import BeautifulSoup
from typing import Dict, List, Optional, Union, Tuple
from datetime import datetime
from itertools import product

class UCRCourseScraper:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = "https://registrationssb.ucr.edu"
        self.unique_session_id = None
        self.synchronizer_token = None
        
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Connection': 'keep-alive',
            'Sec-Ch-Ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
        })

    def clear_session(self):
        self.session.cookies.clear()
        self.unique_session_id = None
        self.synchronizer_token = None

    def initialize_session(self, term="202540"):
        main_url = f"{self.base_url}/StudentRegistrationSsb"
        self.session.get(main_url)
        
        term_url = f"{self.base_url}/StudentRegistrationSsb/ssb/term/termSelection?mode=search"
        self.session.get(term_url)
        
        term_post_url = f"{self.base_url}/StudentRegistrationSsb/ssb/term/search"
        term_data = {
            'term': term,
            'studyPath': '',
            'studyPathText': '',
            'startDatepicker': '',
            'endDatepicker': '',
            'uniqueSessionId': f"0vmfe{int(time.time() * 1000)}"
        }
        
        post_headers = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': term_url
        }
        
        self.session.post(term_post_url, data=term_data, headers=post_headers)
        
        class_search_url = f"{self.base_url}/StudentRegistrationSsb/ssb/classSearch/classSearch"
        response = self.session.get(class_search_url)
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string:
                patterns = [
                    r'synchronizerToken["\']?\s*[:=]\s*["\']([^"\']+)["\']',
                    r'token["\']?\s*[:=]\s*["\']([a-f0-9-]{36})["\']',
                    r'csrfToken["\']?\s*[:=]\s*["\']([^"\']+)["\']',
                ]
                
                for pattern in patterns:
                    token_match = re.search(pattern, script.string, re.IGNORECASE)
                    if token_match:
                        self.synchronizer_token = token_match.group(1)
                        break
                
                if self.synchronizer_token:
                    break
        
        if not self.synchronizer_token:
            meta_tags = soup.find_all('meta')
            for meta in meta_tags:
                if meta.get('name') in ['_token', 'csrf-token', 'synchronizer-token']:
                    self.synchronizer_token = meta.get('content')
                    break
        
        if not self.synchronizer_token:
            inputs = soup.find_all('input', type='hidden')
            for inp in inputs:
                if 'token' in inp.get('name', '').lower():
                    self.synchronizer_token = inp.get('value')
                    break
        
        self.unique_session_id = f"0vmfe{int(time.time() * 1000)}"

    def sCourse(self, course_code, term="202540"):
        
        if not self.unique_session_id:
            self.initialize_session(term)
        
        match = re.match(r'([A-Z]+)(\d+)([A-Z]*)', course_code.upper())
        if not match:
            raise ValueError("Invalid course code format. Use format like 'CS100' or 'CS010C'")
        
        subject = match.group(1)
        course_num = match.group(2)
        suffix = match.group(3)
        full_course = f"{subject}{course_num}{suffix}"
        
        search_url = f"{self.base_url}/StudentRegistrationSsb/ssb/searchResults/searchResults"
        
        params = {
            'txt_subjectcoursecombo': full_course,
            'txt_term': term,
            'startDatepicker': '',
            'endDatepicker': '',
            'uniqueSessionId': self.unique_session_id,
            'pageOffset': '0',
            'pageMaxSize': '50',
            'sortColumn': 'subjectDescription',
            'sortDirection': 'asc'
        }
        
        headers = {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': f"{self.base_url}/StudentRegistrationSsb/ssb/classSearch/classSearch",
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
        }
        
        if self.synchronizer_token:
            headers['X-Synchronizer-Token'] = self.synchronizer_token
        
        response = self.session.get(search_url, params=params, headers=headers)
        
        if response.status_code != 200:
            raise Exception(f"Search failed with status code: {response.status_code}")
        
        try:
            data = response.json()
            return data
        except json.JSONDecodeError:
            raise Exception("Invalid JSON response from server")

    def categorizeSection(self, section_num: str, schedule_type: str) -> str:
        schedule_type_lower = schedule_type.lower()
        
        try:
            section_int = int(section_num)
        except:
            section_int = 0
        
        if 'lecture' in schedule_type_lower and 'lab' not in schedule_type_lower:
            return 'lecture'
        elif 'lab' in schedule_type_lower:
            return 'lab'  
        elif 'discussion' in schedule_type_lower or 'disc' in schedule_type_lower:
            return 'discussion'
        
        if section_int > 0:
            if section_int <= 9:
                return 'lecture'
            elif 10 <= section_int <= 19:
                if section_int <= 15:
                    return 'lecture'
                else:
                    return 'discussion'
            elif 20 <= section_int <= 29:
                if section_int <= 24:
                    return 'lab'
                else:
                    return 'discussion'
            else:
                return 'discussion'
        
        return 'lecture'

    def format_time(self, time_str: str) -> str:
        if not time_str or len(time_str) != 4:
            return "TBA"
        
        try:
            hour = int(time_str[:2])
            minute = time_str[2:]
            
            if hour == 0:
                formatted_time = f"12:{minute} AM"
            elif hour < 12:
                formatted_time = f"{hour}:{minute} AM"
            elif hour == 12:
                formatted_time = f"12:{minute} PM"
            else:
                formatted_time = f"{hour - 12}:{minute} PM"
            
            return formatted_time
        except ValueError:
            return "TBA"

    def parseMin(self, time_str: str) -> int:
        if not time_str or time_str == "TBA" or len(time_str) != 4:
            return -1
        
        try:
            hour = int(time_str[:2])
            minute = int(time_str[2:])
            return hour * 60 + minute
        except ValueError:
            return -1

    def extractMeeting(self, course_data: Dict) -> Dict:
        meeting_details = {
            'schedule': 'TBA',
            'location': 'TBA',
            'days_list': [],
            'start_time_minutes': -1,
            'end_time_minutes': -1,
            'raw_start_time': '',
            'raw_end_time': ''
        }
        
        if not course_data.get('meetingsFaculty'):
            return meeting_details
        
        for meeting in course_data['meetingsFaculty']:
            if meeting.get('meetingTime'):
                mt = meeting['meetingTime']
                
                days = []
                days_map = {
                    'monday': 'M', 'tuesday': 'T', 'wednesday': 'W',
                    'thursday': 'R', 'friday': 'F', 'saturday': 'S', 'sunday': 'U'
                }
                
                for day, abbrev in days_map.items():
                    if mt.get(day):
                        days.append(abbrev)
                
                raw_start_time = mt.get('beginTime', '')
                raw_end_time = mt.get('endTime', '')
                
                begin_time = self.format_time(raw_start_time)
                end_time = self.format_time(raw_end_time)
                
                building = mt.get('buildingDescription', 'TBA')
                room = mt.get('room', '')
                location = f"{building} {room}".strip() if room else building
                
                day_str = ''.join(days) if days else 'TBA'
                time_str = f"{begin_time} - {end_time}" if begin_time != "TBA" and end_time != "TBA" else "TBA"
                schedule = f"{day_str} {time_str}" if day_str != 'TBA' or time_str != 'TBA' else 'TBA'
                
                meeting_details.update({
                    'schedule': schedule,
                    'location': location,
                    'days_list': days,
                    'raw_start_time': raw_start_time,
                    'raw_end_time': raw_end_time,
                    'start_time_minutes': self.parseMin(raw_start_time),
                    'end_time_minutes': self.parseMin(raw_end_time)
                })
                break
        
        return meeting_details

    def linkCourse(self, course_code: str, term: str = "202540") -> Dict:
        try:
            self.clear_session()
            self.initialize_session(term)
            time.sleep(1)
            
            course_data = self.sCourse(course_code, term)
            
            if not course_data.get('success') or not course_data.get('data'):
                return {
                    'success': False,
                    'error': f'No sections found for {course_code.upper()}',
                    'course_code': course_code.upper()
                }
            
            sections = course_data['data']
            lectures = []
            labs = []
            discussions = []
            
            for section in sections:
                schedule_type = section.get('scheduleTypeDescription', '').lower()
                meeting_details = self.extractMeeting(section)
                section_num = section['sequenceNumber']
                
                categorized_type = self.categorizeSection(section_num, schedule_type)
                
                sectionI = {
                    'crn': section['courseReferenceNumber'],
                    'course_title': section['courseTitle'],
                    'course_code': f"{section['subject']}{section['courseNumber']}",
                    'section': section_num,
                    'schedule_type': section.get('scheduleTypeDescription', 'Unknown'),
                    'categorized_type': categorized_type,
                    'enrollment': {
                        'current': section['enrollment'],
                        'maximum': section['maximumEnrollment'],
                        'available': section['seatsAvailable']
                    },
                    'instructors': [f.get('displayName', 'TBA') for f in section.get('faculty', [])],
                    'schedule': meeting_details['schedule'],
                    'location': meeting_details['location'],
                    'days_list': meeting_details['days_list'],
                    'start_time_minutes': meeting_details['start_time_minutes'],
                    'end_time_minutes': meeting_details['end_time_minutes'],
                    'raw_start_time': meeting_details['raw_start_time'],
                    'raw_end_time': meeting_details['raw_end_time']
                }
                
                if categorized_type == 'lecture':
                    lectures.append(sectionI)
                elif categorized_type == 'lab':
                    labs.append(sectionI)
                elif categorized_type == 'discussion':
                    discussions.append(sectionI)
            
            validCombo = self.findLink(lectures, labs, discussions)
            
            return {
                'success': True,
                'course_code': course_code.upper(),
                'combinations': validCombo,
                'lectures': lectures,
                'labs': labs,
                'discussions': discussions
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'course_code': course_code.upper()
            }

    def findLink(self, lectures: List[Dict], labs: List[Dict], discussions: List[Dict]) -> List[Dict]:
        validCombo = []
        
        if not lectures:
            return validCombo
        
        if len(lectures) == 1:
            lecture = lectures[0]
            labO = labs if labs else [None]
            discO = discussions if discussions else [None]
            
            for lab in labO:
                for disc in discO:
                    validCombo.append({
                        'lecture': lecture,
                        'lab': lab,
                        'discussion': disc
                    })
            return validCombo
        
        pLink = self.iLinked(lectures, labs, discussions)
        if pLink:
            return pLink
        
        return self.cLinking(lectures, labs, discussions)
    
    def iLinked(self, lectures: List[Dict], labs: List[Dict], discussions: List[Dict]) -> List[Dict]:
        combinations = []
        
        lectures_sorted = sorted(lectures, key=lambda x: int(x['section']))
        labs_sorted = sorted(labs, key=lambda x: int(x['section']))
        discussions_sorted = sorted(discussions, key=lambda x: int(x['section']))
        
        for lecture in lectures_sorted:
            lecNum = int(lecture['section'])
            
            linked_labs = []
            linked_discussions = []
            
            if len(lectures_sorted) == 2:
                if lecNum == 1:
                    half_labs = len(labs_sorted) // 2
                    linked_labs = labs_sorted[:half_labs] if labs_sorted else []
                    
                    half_discs = len(discussions_sorted) // 2  
                    linked_discussions = discussions_sorted[:half_discs] if discussions_sorted else []
                    
                elif lecNum == 2:
                    half_labs = len(labs_sorted) // 2
                    linked_labs = labs_sorted[half_labs:] if labs_sorted else []
                    
                    half_discs = len(discussions_sorted) // 2
                    linked_discussions = discussions_sorted[half_discs:] if discussions_sorted else []
            else:
                for lab in labs_sorted:
                    lab_num = int(lab['section'])
                    if self.sectionslinked(lecNum, lab_num):
                        linked_labs.append(lab)
                
                for disc in discussions_sorted:
                    disc_num = int(disc['section'])
                    if self.sectionslinked(lecNum, disc_num):
                        linked_discussions.append(disc)
            
            labO = linked_labs if linked_labs else [None]
            discO = linked_discussions if linked_discussions else [None]
            
            for lab in labO:
                for disc in discO:
                    combinations.append({
                        'lecture': lecture,
                        'lab': lab,
                        'discussion': disc
                    })
        
        return combinations if combinations else None
    
    def cLinking(self, lectures: List[Dict], labs: List[Dict], discussions: List[Dict]) -> List[Dict]:
        combinations = []
        
        linkLabLecture = max(1, len(labs) // len(lectures)) if labs else 0
        linkDiscussionLecture = max(1, len(discussions) // len(lectures)) if discussions else 0
        
        for i, lecture in enumerate(lectures):
            start_lab = i * linkLabLecture
            end_lab = min((i + 1) * linkLabLecture, len(labs))
            assigned_labs = labs[start_lab:end_lab] if labs else []
            
            startDisc = i * linkDiscussionLecture
            endDisc = min((i + 1) * linkDiscussionLecture, len(discussions))
            assigned_discussions = discussions[startDisc:endDisc] if discussions else []
            
            labO = assigned_labs if assigned_labs else [None]
            discO = assigned_discussions if assigned_discussions else [None]
            
            for lab in labO:
                for disc in discO:
                    combinations.append({
                        'lecture': lecture,
                        'lab': lab,
                        'discussion': disc
                    })
        
        return combinations
    
    def sectionslinked(self, lecNum: int, other_num: int) -> bool:
        if lecNum == 0 or other_num == 0:
            return False
        
        diff = abs(other_num - lecNum)
        
        if diff == 0:
            return True
        
        if 1 <= diff <= 3:
            return True
            
        if diff in [10, 20, 30, 100, 200]:
            return True
            
        if lecNum // 10 == other_num // 10:
            return True
            
        return False

    def timesConflict(self, section1: Dict, section2: Dict) -> bool:
        if (section1['start_time_minutes'] == -1 or section1['end_time_minutes'] == -1 or
            section2['start_time_minutes'] == -1 or section2['end_time_minutes'] == -1):
            return False
        
        days1 = set(section1['days_list'])
        days2 = set(section2['days_list'])
        
        if not days1.intersection(days2):
            return False
        
        start1, end1 = section1['start_time_minutes'], section1['end_time_minutes']
        start2, end2 = section2['start_time_minutes'], section2['end_time_minutes']
        
        return start1 < end2 and start2 < end1

    def scheduleGenerate(self, course_list: List[str], term: str = "202540") -> Dict:
        all_course_options = []
        failedExtraction = []
        
        for course_code in course_list:
            course_options = self.linkCourse(course_code, term)
            if course_options['success']:
                all_course_options.append(course_options)
            else:
                failedExtraction.append({
                    'course': course_code,
                    'error': course_options['error']
                })
        
        if failedExtraction:
            return {
                'success': False,
                'failedExtraction': failedExtraction,
                'error': 'Issue trying to get everything'
            }
        
        courseCombo = []
        
        for course_options in all_course_options:
            courseCombo.append(course_options['combinations'])
        
        fullAmount = list(product(*courseCombo))
        fullCombination = len(fullAmount)
        
        validCombo = []
        
        for combination in fullAmount:
            all_sections = []
            
            for courseCombo in combination:
                all_sections.append(courseCombo['lecture'])
                if courseCombo['lab']:
                    all_sections.append(courseCombo['lab'])
                if courseCombo['discussion']:
                    all_sections.append(courseCombo['discussion'])
            
            issue = False
            
            for i in range(len(all_sections)):
                for j in range(i + 1, len(all_sections)):
                    if self.timesConflict(all_sections[i], all_sections[j]):
                        issue = True
                        break
                if issue:
                    break
            
            if not issue:
                validCombo.append(combination)
        
        results = {
            'success': True,
            'courses_analyzed': course_list,
            'term': term,
            'total_possible_combinations': fullCombination,
            'valid-Combo_count': len(validCombo),
            'conflicting_combinations_count': fullCombination - len(validCombo),
            'valid_schedules': []
        }
        
        for i, combination in enumerate(validCombo, 1):
            schedule = {
                'schedule_id': i,
                'courses': []
            }
            
            for courseCombo in combination:
                courseS = {
                    'course_code': courseCombo['lecture']['course_code'],
                    'lecture': {
                        'crn': courseCombo['lecture']['crn'],
                        'section': courseCombo['lecture']['section'],
                        'schedule': courseCombo['lecture']['schedule'],
                        'location': courseCombo['lecture']['location'],
                        'instructors': courseCombo['lecture']['instructors']
                    }
                }
                
                if courseCombo['lab']:
                    courseS['lab'] = {
                        'crn': courseCombo['lab']['crn'],
                        'section': courseCombo['lab']['section'],
                        'schedule': courseCombo['lab']['schedule'],
                        'location': courseCombo['lab']['location'],
                        'instructors': courseCombo['lab']['instructors']
                    }
                
                if courseCombo['discussion']:
                    courseS['discussion'] = {
                        'crn': courseCombo['discussion']['crn'],
                        'section': courseCombo['discussion']['section'],
                        'schedule': courseCombo['discussion']['schedule'],
                        'location': courseCombo['discussion']['location'],
                        'instructors': courseCombo['discussion']['instructors']
                    }
                
                schedule['courses'].append(courseS)
            
            results['valid_schedules'].append(schedule)
        
        return results

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: Generate Error'
        }))
        return
    
    command = sys.argv[1]
    
    if command != 'generate':
        print(json.dumps({
            'success': False,
            'error': f'Unknown command: {command}'
        }))
        return
    
    courses = sys.argv[2:]
    
    if not courses:
        print(json.dumps({
            'success': False,
            'error': 'No courses provided'
        }))
        return
    
    try:
        scraper = UCRCourseScraper()
        results = scraper.scheduleGenerate(courses)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))

if __name__ == "__main__":
    main()
