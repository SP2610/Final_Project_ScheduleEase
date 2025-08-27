# scripts/course_scraper.py
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

    def search_course(self, course_code, term="202540"):
        
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

    def categorize_section_type(self, section_num: str, schedule_type: str) -> str:
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

    def parse_time_to_minutes(self, time_str: str) -> int:
        if not time_str or time_str == "TBA" or len(time_str) != 4:
            return -1
        
        try:
            hour = int(time_str[:2])
            minute = int(time_str[2:])
            return hour * 60 + minute
        except ValueError:
            return -1

    def extract_meeting_details(self, course_data: Dict) -> Dict:
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
                    'start_time_minutes': self.parse_time_to_minutes(raw_start_time),
                    'end_time_minutes': self.parse_time_to_minutes(raw_end_time)
                })
                break
        
        return meeting_details

    def analyze_section_linking_patterns(self, course_code: str, term: str = "202540") -> Dict:
        try:
            self.clear_session()
            self.initialize_session(term)
            time.sleep(1)
            
            course_data = self.search_course(course_code, term)
            
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
                meeting_details = self.extract_meeting_details(section)
                section_num = section['sequenceNumber']
                
                categorized_type = self.categorize_section_type(section_num, schedule_type)
                
                section_info = {
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
                    lectures.append(section_info)
                elif categorized_type == 'lab':
                    labs.append(section_info)
                elif categorized_type == 'discussion':
                    discussions.append(section_info)
            
            valid_combinations = self.determine_advanced_linking(lectures, labs, discussions)
            
            return {
                'success': True,
                'course_code': course_code.upper(),
                'combinations': valid_combinations,
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

    def determine_advanced_linking(self, lectures: List[Dict], labs: List[Dict], discussions: List[Dict]) -> List[Dict]:
        valid_combinations = []
        
        if not lectures:
            return valid_combinations
        
        if len(lectures) == 1:
            lecture = lectures[0]
            lab_options = labs if labs else [None]
            disc_options = discussions if discussions else [None]
            
            for lab in lab_options:
                for disc in disc_options:
                    valid_combinations.append({
                        'lecture': lecture,
                        'lab': lab,
                        'discussion': disc
                    })
            return valid_combinations
        
        pattern_links = self.find_improved_section_pattern_links(lectures, labs, discussions)
        if pattern_links:
            return pattern_links
        
        return self.conservative_linking(lectures, labs, discussions)
    
    def find_improved_section_pattern_links(self, lectures: List[Dict], labs: List[Dict], discussions: List[Dict]) -> List[Dict]:
        combinations = []
        
        lectures_sorted = sorted(lectures, key=lambda x: int(x['section']))
        labs_sorted = sorted(labs, key=lambda x: int(x['section']))
        discussions_sorted = sorted(discussions, key=lambda x: int(x['section']))
        
        for lecture in lectures_sorted:
            lec_num = int(lecture['section'])
            
            linked_labs = []
            linked_discussions = []
            
            if len(lectures_sorted) == 2:
                if lec_num == 1:
                    half_labs = len(labs_sorted) // 2
                    linked_labs = labs_sorted[:half_labs] if labs_sorted else []
                    
                    half_discs = len(discussions_sorted) // 2  
                    linked_discussions = discussions_sorted[:half_discs] if discussions_sorted else []
                    
                elif lec_num == 2:
                    half_labs = len(labs_sorted) // 2
                    linked_labs = labs_sorted[half_labs:] if labs_sorted else []
                    
                    half_discs = len(discussions_sorted) // 2
                    linked_discussions = discussions_sorted[half_discs:] if discussions_sorted else []
            else:
                for lab in labs_sorted:
                    lab_num = int(lab['section'])
                    if self.sections_numerically_linked(lec_num, lab_num):
                        linked_labs.append(lab)
                
                for disc in discussions_sorted:
                    disc_num = int(disc['section'])
                    if self.sections_numerically_linked(lec_num, disc_num):
                        linked_discussions.append(disc)
            
            lab_options = linked_labs if linked_labs else [None]
            disc_options = linked_discussions if linked_discussions else [None]
            
            for lab in lab_options:
                for disc in disc_options:
                    combinations.append({
                        'lecture': lecture,
                        'lab': lab,
                        'discussion': disc
                    })
        
        return combinations if combinations else None
    
    def conservative_linking(self, lectures: List[Dict], labs: List[Dict], discussions: List[Dict]) -> List[Dict]:
        combinations = []
        
        labs_per_lecture = max(1, len(labs) // len(lectures)) if labs else 0
        discussions_per_lecture = max(1, len(discussions) // len(lectures)) if discussions else 0
        
        for i, lecture in enumerate(lectures):
            start_lab = i * labs_per_lecture
            end_lab = min((i + 1) * labs_per_lecture, len(labs))
            assigned_labs = labs[start_lab:end_lab] if labs else []
            
            start_disc = i * discussions_per_lecture
            end_disc = min((i + 1) * discussions_per_lecture, len(discussions))
            assigned_discussions = discussions[start_disc:end_disc] if discussions else []
            
            lab_options = assigned_labs if assigned_labs else [None]
            disc_options = assigned_discussions if assigned_discussions else [None]
            
            for lab in lab_options:
                for disc in disc_options:
                    combinations.append({
                        'lecture': lecture,
                        'lab': lab,
                        'discussion': disc
                    })
        
        return combinations
    
    def sections_numerically_linked(self, lec_num: int, other_num: int) -> bool:
        if lec_num == 0 or other_num == 0:
            return False
        
        diff = abs(other_num - lec_num)
        
        if diff == 0:
            return True
        
        if 1 <= diff <= 3:
            return True
            
        if diff in [10, 20, 30, 100, 200]:
            return True
            
        if lec_num // 10 == other_num // 10:
            return True
            
        return False

    def times_conflict(self, section1: Dict, section2: Dict) -> bool:
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

    def generate_schedule_combinations(self, course_list: List[str], term: str = "202540") -> Dict:
        all_course_options = []
        failed_courses = []
        
        for course_code in course_list:
            course_options = self.analyze_section_linking_patterns(course_code, term)
            if course_options['success']:
                all_course_options.append(course_options)
            else:
                failed_courses.append({
                    'course': course_code,
                    'error': course_options['error']
                })
        
        if failed_courses:
            return {
                'success': False,
                'failed_courses': failed_courses,
                'error': 'Some courses could not be retrieved'
            }
        
        course_combinations = []
        
        for course_options in all_course_options:
            course_combinations.append(course_options['combinations'])
        
        all_combinations = list(product(*course_combinations))
        total_combinations = len(all_combinations)
        
        valid_combinations = []
        
        for combination in all_combinations:
            all_sections = []
            
            for course_combo in combination:
                all_sections.append(course_combo['lecture'])
                if course_combo['lab']:
                    all_sections.append(course_combo['lab'])
                if course_combo['discussion']:
                    all_sections.append(course_combo['discussion'])
            
            has_conflict = False
            
            for i in range(len(all_sections)):
                for j in range(i + 1, len(all_sections)):
                    if self.times_conflict(all_sections[i], all_sections[j]):
                        has_conflict = True
                        break
                if has_conflict:
                    break
            
            if not has_conflict:
                valid_combinations.append(combination)
        
        results = {
            'success': True,
            'courses_analyzed': course_list,
            'term': term,
            'total_possible_combinations': total_combinations,
            'valid_combinations_count': len(valid_combinations),
            'conflicting_combinations_count': total_combinations - len(valid_combinations),
            'valid_schedules': []
        }
        
        for i, combination in enumerate(valid_combinations, 1):
            schedule = {
                'schedule_id': i,
                'courses': []
            }
            
            for course_combo in combination:
                course_schedule = {
                    'course_code': course_combo['lecture']['course_code'],
                    'lecture': {
                        'crn': course_combo['lecture']['crn'],
                        'section': course_combo['lecture']['section'],
                        'schedule': course_combo['lecture']['schedule'],
                        'location': course_combo['lecture']['location'],
                        'instructors': course_combo['lecture']['instructors']
                    }
                }
                
                if course_combo['lab']:
                    course_schedule['lab'] = {
                        'crn': course_combo['lab']['crn'],
                        'section': course_combo['lab']['section'],
                        'schedule': course_combo['lab']['schedule'],
                        'location': course_combo['lab']['location'],
                        'instructors': course_combo['lab']['instructors']
                    }
                
                if course_combo['discussion']:
                    course_schedule['discussion'] = {
                        'crn': course_combo['discussion']['crn'],
                        'section': course_combo['discussion']['section'],
                        'schedule': course_combo['discussion']['schedule'],
                        'location': course_combo['discussion']['location'],
                        'instructors': course_combo['discussion']['instructors']
                    }
                
                schedule['courses'].append(course_schedule)
            
            results['valid_schedules'].append(schedule)
        
        return results

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python course_scraper.py generate COURSE1 COURSE2 ...'
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
        results = scraper.generate_schedule_combinations(courses)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))

if __name__ == "__main__":
    main()