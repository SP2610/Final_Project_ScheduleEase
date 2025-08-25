import requests
import json
import time
import re
from bs4 import BeautifulSoup

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
            return response.json()
        except json.JSONDecodeError:
            raise Exception("Invalid JSON response from server")

    def search_by_subject(self, subject, term="202540"):
       
        if not self.unique_session_id:
            self.initialize_session(term)
        
        search_url = f"{self.base_url}/StudentRegistrationSsb/ssb/searchResults/searchResults"
        
        params = {
            'txt_subject': subject.upper(),
            'txt_term': term,
            'startDatepicker': '',
            'endDatepicker': '',
            'uniqueSessionId': self.unique_session_id,
            'pageOffset': '0',
            'pageMaxSize': '100', 
            'sortColumn': 'subjectDescription',
            'sortDirection': 'asc'
        }
        
        headers = {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': f"{self.base_url}/StudentRegistrationSsb/ssb/classSearch/classSearch",
            'Cache-Control': 'no-cache, no-store'
        }
        
        if self.synchronizer_token:
            headers['X-Synchronizer-Token'] = self.synchronizer_token
        
        response = self.session.get(search_url, params=params, headers=headers)
        
        if response.status_code == 200:
            try:
                return response.json()
            except json.JSONDecodeError:
                raise Exception("Invalid JSON response from server")
        
        raise Exception(f"Subject search failed with status code: {response.status_code}")

    def get_course_suggestions(self, search_term, term="202540"):
        
        if not self.unique_session_id:
            self.initialize_session(term)
        
        url = f"{self.base_url}/StudentRegistrationSsb/ssb/classSearch/get_subjectcoursecombo"
        
        params = {
            'searchTerm': search_term.lower(),
            'term': term,
            'offset': '1',
            'max': '50',
            'uniqueSessionId': self.unique_session_id,
            '_': str(int(time.time() * 1000))
        }
        
        headers = {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': f"{self.base_url}/StudentRegistrationSsb/ssb/classSearch/classSearch",
            'Cache-Control': 'no-cache, no-store'
        }
        
        if self.synchronizer_token:
            headers['X-Synchronizer-Token'] = self.synchronizer_token
        
        response = self.session.get(url, params=params, headers=headers)
        
        if response.status_code == 200:
            try:
                return response.json()
            except json.JSONDecodeError:
                return []
        return []

    def format_course_info(self, course_data):
        
        if not course_data.get('success') or not course_data.get('data'):
            return []
        
        formatted_courses = []
        
        for course in course_data['data']:
            formatted = {
                'course_code': f"{course['subject']}{course['courseNumber']}",
                'course_title': course['courseTitle'],
                'subject': course['subjectDescription'],
                'credits': course['creditHours'],
                'crn': course['courseReferenceNumber'],
                'section': course['sequenceNumber'],
                'term': course['termDesc'],
                'enrollment': {
                    'current': course['enrollment'],
                    'maximum': course['maximumEnrollment'],
                    'available': course['seatsAvailable']
                },
                'waitlist': {
                    'capacity': course['waitCapacity'],
                    'count': course['waitCount'],
                    'available': course['waitAvailable']
                },
                'schedule': [],
                'instructors': [],
                'open_section': course['openSection'],
                'instructional_method': course.get('instructionalMethodDescription', 'Unknown')
            }
            
            
            for meeting in course.get('meetingsFaculty', []):
                if 'meetingTime' in meeting:
                    mt = meeting['meetingTime']
                    
                    
                    begin_time = mt['beginTime']
                    end_time = mt['endTime']
                    
                    if begin_time and end_time:
                        begin_formatted = f"{int(begin_time[:2])}:{begin_time[2:]}"
                        end_formatted = f"{int(end_time[:2])}:{end_time[2:]}"
                        time_str = f"{begin_formatted}-{end_formatted}"
                    else:
                        time_str = "TBA"
                    
                    schedule_info = {
                        'days': [],
                        'time': time_str,
                        'location': f"{mt.get('buildingDescription', 'TBA')} {mt.get('room', '')}".strip(),
                        'start_date': mt.get('startDate'),
                        'end_date': mt.get('endDate'),
                        'meeting_type': mt.get('meetingTypeDescription', 'Unknown')
                    }
                    
                    
                    days_map = {
                        'monday': 'M', 'tuesday': 'T', 'wednesday': 'W',
                        'thursday': 'R', 'friday': 'F', 'saturday': 'S', 'sunday': 'U'
                    }
                    
                    for day, abbrev in days_map.items():
                        if mt.get(day):
                            schedule_info['days'].append(abbrev)
                    
                    formatted['schedule'].append(schedule_info)
            
            
            for faculty in course.get('faculty', []):
                formatted['instructors'].append({
                    'name': faculty['displayName'],
                    'email': faculty['emailAddress'],
                    'primary': faculty['primaryIndicator']
                })
            
            formatted_courses.append(formatted)
        
        return formatted_courses

    def search_multiple_courses(self, course_codes, term="202540"):
        
        results = {}
        
        for course_code in course_codes:
            try:
                result = self.search_course(course_code, term)
                results[course_code] = result
                time.sleep(0.5)  
            except Exception as e:
                results[course_code] = {"error": str(e), "success": False}
        
        return results


def save_to_json(data, filename):
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Data saved to {filename}")

def print_course_summary(course_data):
    
    if not course_data.get('success'):
        print("No results found")
        return
    
    courses = course_data['data']
    print(f"Found {len(courses)} sections:")
    
    for course in courses:
        print(f"\n  {course['subject']} {course['courseNumber']}-{course['sequenceNumber']} (CRN: {course['courseReferenceNumber']})")
        print(f"  {course['courseTitle']}")
        print(f"  Credits: {course['creditHours']}")
        print(f"  Enrollment: {course['enrollment']}/{course['maximumEnrollment']} (Available: {course['seatsAvailable']})")
        print(f"  Instructors: {', '.join([f['displayName'] for f in course.get('faculty', [])])}")
        
        for meeting in course.get('meetingsFaculty', []):
            if 'meetingTime' in meeting:
                mt = meeting['meetingTime']
                days = []
                day_mapping = {'monday': 'M', 'tuesday': 'T', 'wednesday': 'W', 'thursday': 'R', 'friday': 'F'}
                for day, abbrev in day_mapping.items():
                    if mt.get(day):
                        days.append(abbrev)
                
                time_str = f"{mt['beginTime']}-{mt['endTime']}" if mt.get('beginTime') else "TBA"
                location = f"{mt.get('buildingDescription', 'TBA')} {mt.get('room', '')}".strip()
                print(f"  Schedule: {''.join(days)} {time_str} @ {location}")

def main():
    
    scraper = UCRCourseScraper()
    
    try:
        print("=== UCR Course Scraper ===\n")
        
        
        print("1. Searching for CS100...")
        cs100_result = scraper.search_course("CS100")
        print_course_summary(cs100_result)
        
       
        save_to_json(cs100_result, 'cs100_results.json')
        
        print("\n" + "="*50 + "\n")
        
        
        print("2. Searching for all CS courses (first 5)...")
        cs_courses = scraper.search_by_subject("CS")
        if cs_courses.get('success') and cs_courses.get('data'):
            print(f"Found {cs_courses['totalCount']} total CS courses")
            
            limited_result = cs_courses.copy()
            limited_result['data'] = cs_courses['data'][:5]
            print_course_summary(limited_result)
        
        print("\n" + "="*50 + "\n")
        
        
        print("3. Searching for multiple courses...")
        course_list = ["CS100", "CS010C", "MATH009A"]
        multiple_results = scraper.search_multiple_courses(course_list)
        
        for course_code, result in multiple_results.items():
            if result.get('success'):
                print(f"{course_code}: {result['totalCount']} sections found")
            else:
                print(f"{course_code}: No results or error")
        
        print("\n" + "="*50 + "\n")
        
        print("4. Getting course suggestions for 'cs'...")
        suggestions = scraper.get_course_suggestions("cs")
        print(f"Found {len(suggestions)} suggestions:")
        for i, suggestion in enumerate(suggestions[:10], 1):  
            print(f"  {i}. {suggestion['code']} - {suggestion['description']}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()