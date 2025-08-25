import requests
import json
import time
import re
from bs4 import BeautifulSoup
from typing import Dict, List, Optional, Union

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

    def get_linked_sections(self, crn: str, term: str = "202540") -> Dict:
        url = f"{self.base_url}/StudentRegistrationSsb/ssb/searchResults/fetchLinkedSections"
        
        params = {
            'term': term,
            'courseReferenceNumber': crn
        }
        
        headers = {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest"
        }
        
        try:
            response = self.session.get(url, params=params, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"Failed with status code: {response.status_code}", "success": False}
                
        except Exception as e:
            return {"error": str(e), "success": False}

    def identify_lecture_courses(self, course_data: Dict) -> List[Dict]:
        if not course_data.get('success') or not course_data.get('data'):
            return []
        
        lecture_courses = []
        
        for course in course_data['data']:

            schedule_type = course.get('scheduleTypeDescription', '').lower()
            instructional_method = course.get('instructionalMethodDescription', '').lower()
            

            is_lecture = (
                'lecture' in schedule_type or
                'lec' in schedule_type or
                schedule_type == '' or  
                'in-person' in instructional_method
            )
            

            non_lecture_types = ['lab', 'laboratory', 'discussion', 'seminar', 'studio', 'clinic', 'internship']
            is_non_lecture = any(nl_type in schedule_type for nl_type in non_lecture_types)
            
            if is_lecture and not is_non_lecture:
                lecture_info = {
                    'crn': course['courseReferenceNumber'],
                    'course_title': course['courseTitle'],
                    'course_code': f"{course['subject']}{course['courseNumber']}",
                    'section': course['sequenceNumber'],
                    'subject': course['subject'],
                    'course_number': course['courseNumber'],
                    'schedule_type': course.get('scheduleTypeDescription', 'Unknown'),
                    'enrollment': {
                        'current': course['enrollment'],
                        'maximum': course['maximumEnrollment'],
                        'available': course['seatsAvailable']
                    },
                    'instructors': [f['displayName'] for f in course.get('faculty', [])],
                    'is_linked': course.get('isSectionLinked', False),
                    'link_identifier': course.get('linkIdentifier', None)
                }
                lecture_courses.append(lecture_info)
        
        return lecture_courses

    def analyze_course_complete(self, course_code: str, term: str = "202540") -> Dict:
        try:
            print(f" Course Analysis - {course_code.upper()}")
            print("="*50)
            

            print(f"\n Searching for {course_code.upper()}...")
            course_data = self.search_course(course_code, term)
            
            if not course_data.get('success'):
                print(f" Failed to find {course_code.upper()}")
                return {
                    'success': False,
                    'error': f'Course {course_code.upper()} not found',
                    'course_code': course_code.upper()
                }
            
            print(f" Found {course_data['totalCount']} total sections for {course_code.upper()}")
            

            print(f"\n Identifying lecture sections...")
            lecture_courses = self.identify_lecture_courses(course_data)
            
            if not lecture_courses:
                print(" No lecture sections found")
                return {
                    'success': False,
                    'error': 'No lecture sections found',
                    'course_code': course_code.upper(),
                    'all_sections': course_data['data']
                }
            
            print(f"Found {len(lecture_courses)} lecture section(s):")
            for i, lecture in enumerate(lecture_courses, 1):
                print(f"   {i}. CRN: {lecture['crn']} - Section: {lecture['section']} - {lecture['course_title']}")
            

            print(f"\n Getting linked sections for each lecture...")
            

            unique_labs = {}
            unique_discussions = {}
            unique_other = {}
            
            complete_results = {
                'course_code': course_code.upper(),
                'term': term,
                'total_sections_found': course_data['totalCount'],
                'lecture_sections_found': len(lecture_courses),
                'lecture_details': []
            }
            
            for i, lecture in enumerate(lecture_courses, 1):
                print(f"\n   Processing Lecture {i}:")
                print(f"      Course: {course_code.upper()} - {lecture['course_title']}")
                print(f"      CRN: {lecture['crn']}")
                print(f"      Section: {lecture['section']}")
                

                print(f"      Fetching linked sections...")
                linked_data = self.get_linked_sections(lecture['crn'], term)
                
                lecture_result = {
                    'lecture_info': lecture,
                    'linked_sections_raw': linked_data,
                    'labs': [],
                    'discussions': [],
                    'other_sections': []
                }
                
                if linked_data and not linked_data.get('error'):

                    if linked_data.get('linkedData') and len(linked_data['linkedData']) > 0:

                        all_linked_sections = []
                        for section_group in linked_data['linkedData']:
                            if isinstance(section_group, list):
                                all_linked_sections.extend(section_group)
                            else:
                                all_linked_sections.append(section_group)
                        
                        print(f"      Found {len(all_linked_sections)} linked section(s)")
                        

                        for section in all_linked_sections:
                            crn = section['courseReferenceNumber']
                            section_type = section.get('scheduleTypeDescription', '').lower()
                            

                            meeting_info = "TBA"
                            location_info = "TBA"
                            if section.get('meetingsFaculty'):
                                for meeting in section['meetingsFaculty']:
                                    if meeting.get('meetingTime'):
                                        mt = meeting['meetingTime']
                                        begin_time = mt.get('beginTime', '')
                                        end_time = mt.get('endTime', '')
                                        
                                        if begin_time and end_time:
                                            begin_formatted = f"{int(begin_time[:2])}:{begin_time[2:]}"
                                            end_formatted = f"{int(end_time[:2])}:{end_time[2:]}"
                                            meeting_info = f"{begin_formatted}-{end_formatted}"
                                        

                                        days = []
                                        days_map = {
                                            'monday': 'M', 'tuesday': 'T', 'wednesday': 'W',
                                            'thursday': 'R', 'friday': 'F', 'saturday': 'S', 'sunday': 'U'
                                        }
                                        
                                        for day, abbrev in days_map.items():
                                            if mt.get(day):
                                                days.append(abbrev)
                                        
                                        day_str = ''.join(days) if days else 'TBA'
                                        meeting_info = f"{day_str} {meeting_info}"
                                        
                                        building = mt.get('buildingDescription', 'TBA')
                                        room = mt.get('room', '')
                                        location_info = f"{building} {room}".strip()
                                        break
                            
                            section_info = {
                                'crn': crn,
                                'section': section['sequenceNumber'],
                                'type': section.get('scheduleTypeDescription', 'Unknown'),
                                'title': section.get('courseTitle', ''),
                                'enrollment': section['enrollment'],
                                'maximum_enrollment': section['maximumEnrollment'],
                                'available': section['seatsAvailable'],
                                'waitlist_count': section.get('waitCount', 0),
                                'waitlist_available': section.get('waitAvailable', 0),
                                'instructors': [f['displayName'] for f in section.get('faculty', [])],
                                'meeting_time': meeting_info,
                                'location': location_info,
                                'link_identifier': section.get('linkIdentifier', ''),
                                'linked_to_lectures': [lecture['crn']]  
                            }
                            

                            if 'lab' in section_type:
                                if crn not in unique_labs:
                                    unique_labs[crn] = section_info
                                    print(f"         Lab: CRN {crn} (Section {section_info['section']}) - {meeting_info} @ {location_info}")
                                else:

                                    unique_labs[crn]['linked_to_lectures'].append(lecture['crn'])
                                    print(f"         Lab CRN {crn} also linked to this lecture")
                                
                                lecture_result['labs'].append(section_info)
                                
                            elif 'discussion' in section_type or 'disc' in section_type:
                                if crn not in unique_discussions:
                                    unique_discussions[crn] = section_info
                                    print(f"         Discussion: CRN {crn} (Section {section_info['section']}) - {meeting_info} @ {location_info}")
                                else:

                                    unique_discussions[crn]['linked_to_lectures'].append(lecture['crn'])
                                    print(f"         Discussion CRN {crn} also linked to this lecture")
                                
                                lecture_result['discussions'].append(section_info)
                                
                            else:
                                if crn not in unique_other:
                                    unique_other[crn] = section_info
                                    print(f"         {section_info['type']}: CRN {crn} (Section {section_info['section']}) - {meeting_info} @ {location_info}")
                                else:

                                    unique_other[crn]['linked_to_lectures'].append(lecture['crn'])
                                    print(f"         {section_info['type']} CRN {crn} also linked to this lecture")
                                
                                lecture_result['other_sections'].append(section_info)
                    else:
                        print(f"        No linked sections found")
                        lecture_result['linked_sections_raw'] = {'message': 'No linked sections'}
                else:
                    error_msg = linked_data.get('error', 'Unknown error') if linked_data else 'Failed to fetch'
                    print(f"       Error getting linked sections: {error_msg}")
                    lecture_result['linked_sections_raw'] = {'error': error_msg}
                
                complete_results['lecture_details'].append(lecture_result)
                

                time.sleep(0.5)
            

            complete_results['unique_linked_sections'] = {
                'labs': list(unique_labs.values()),
                'discussions': list(unique_discussions.values()),
                'other': list(unique_other.values())
            }
            

            print(f"\n Summary for {course_code.upper()}:")
            print("-" * 40)
            
            print(f" Total Sections Found: {complete_results['total_sections_found']}")
            print(f" Lecture Sections: {complete_results['lecture_sections_found']}")
            print(f" Unique Lab Sections: {len(unique_labs)}")
            print(f" Unique Discussion Sections: {len(unique_discussions)}")
            print(f" Other Unique Linked Sections: {len(unique_other)}")
            

            shared_count = 0
            for lab_crn, lab_info in unique_labs.items():
                if len(lab_info['linked_to_lectures']) > 1:
                    print(f"   Lab CRN {lab_crn} is shared by {len(lab_info['linked_to_lectures'])} lectures")
                    shared_count += 1
            
            for disc_crn, disc_info in unique_discussions.items():
                if len(disc_info['linked_to_lectures']) > 1:
                    print(f"   Discussion CRN {disc_crn} is shared by {len(disc_info['linked_to_lectures'])} lectures")
                    shared_count += 1
            
            for other_crn, other_info in unique_other.items():
                if len(other_info['linked_to_lectures']) > 1:
                    print(f"   {other_info['type']} CRN {other_crn} is shared by {len(other_info['linked_to_lectures'])} lectures")
                    shared_count += 1
            
            if shared_count > 0:
                print(f" Found {shared_count} shared section(s) across multiple lectures")
            
            complete_results['success'] = True
            return complete_results
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'course_code': course_code.upper()
            }

def save_to_json(data, filename):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Data saved to {filename}")

def main():
    scraper = UCRCourseScraper()
    try:
        
        course_to_analyze = "CS100" 
        

        result = scraper.analyze_course_complete(course_to_analyze)
        
        if result['success']:

            filename = f"{course_to_analyze.lower().replace(' ', '_')}_analysis.json"
            save_to_json(result, filename)
            
            print(f"\n {course_to_analyze} analysis completed successfully!")
            print(f"Results saved to {filename}")
        else:
            print(f"Analysis failed: {result.get('error', 'Unknown error')}")
        
    except Exception as e:
        print(f"Critical error: {e}")
        import traceback
        traceback.print_exc()

def analyze_multiple_courses(course_codes: List[str], term: str = "202540"):
    scraper = UCRCourseScraper()
    results = {}
    
    for course_code in course_codes:
        print(f"\n{'='*60}")
        try:
            result = scraper.analyze_course_complete(course_code, term)
            results[course_code.upper()] = result
            time.sleep(2)  
        except Exception as e:
            results[course_code.upper()] = {
                "error": str(e), 
                "success": False,
                "course_code": course_code.upper()
            }
    
    return results

if __name__ == "__main__":
    main()
    
