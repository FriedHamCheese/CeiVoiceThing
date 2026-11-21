# Test Routine

## Notes
```
- Take notes of emails created, who made the requests, who commented on what, etc...
  but usually you can tell if something looks wrong ig

- unmarked: typically mandatory for requirements or test coverage
- extra: features which are not in the requirements but added, 
  therefore they should be tested
- optional: not required, but nice to do

- UI must not have horizontal scroll bar
- Test responsive design for every page
- HTTPS/SSL
```

##
```
- Drop and recreate ceidb database
- optional: delete node_modules in /frontend and /backend and redo npm install
- start frontend and backend
```

## Register
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- 8 users, im sorry
    - 3 users
        - gmail should be in one of these to test ticket track via email 
    - 2 assignees
    - 2 admins
- mix valid gmail in these
- optional: play around with wrong password and captcha
- optional: be a chad and do some other routines right away after registration for some accounts
```

## Login
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- Login to all of the accounts, yea im sorry
    - optional: play around with wrong email, password and captcha
    - their email is on the navigation bar
```

## Creating requests/Draft Tickets
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- user 1: 2 requests
- user 2: 1 requests
- user 3: 2 requests
- Some requests should be similar enough to test merging suggestion
- Make requests lengthy and obstructive sometimes
- interleaving the each request between users would be nice :D
```
### User Expects
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- submit button exists and working
- unsure: <1 sec?
- feedback after submitting request
- System sent email to all the users per their requests
    - check that the ticket tracking works and rejects invalid token-email combinations
- Tracking tickets via login or token displays information like
    - title
    - id: pending
    - summary/details
    - status
```
### Assigee Expects
Nothing, like draft tickets shouldn't leak to assignees yet alr
### Admin Expects
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- Request to Ticket (AI summary) done in 30 seconds 95% of the time
- In Admin Reports:
    - Probably/Should: Amount of total tickets is 5 tickets with no solved tickets
    - Not sure: all 5 tickets being draft tickets
    - Categories: should be according to the requests but not empty

- In Admin Dashboard:
    - The tickets from the submitted requests to be present, 
      with draft tickets having their dedicated section
        - Visual elements must include: title, request email and time of submission
        - viewing the tickets should contain:
            - title from AI, words not prematurely chopped off
            - summary from AI, words not prematurely chopped off
            - Suggested solutions from AI, words not prematurely chopped off
                - has 1-3 actionable steps
            - Categories from AI, must be from predefined set but ok for now
            - Assignee(s?) from AI
                - At least 1 assignee, unsure: maybe no more than 3?
                - Assignees are specialised for the categories of the ticket
            - The request forming the draft ticket
            - Field for editing deadlines
            - The preview of the request forming the ticket
    - AI suggests merging the similar tickets together
```

## Admin Editing Draft Tickets
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
For some, like 2-3 of the draft tickets:
    - Edit all the text fields
    - Have some tickets to have deadlines and some not touched
    - add/delete the categories
    - add/remove the assignees
    - Actually edit 1-2 tickets, discard editing for 1
    - Check for changes using the editing window
    - Verify changes from user, sometimes from token tracking and sometimes track request page
    - maybe: Admin Reports change according to the edits
```

## Merging as Admin
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- Select 3 tickets, with 2 similar, 1 differing
- unlink the differing ticket
- unlink the other ticket, should close the window
- select the 2 similar tickets
    - window contains title, categories, summary, solutions from the first selected ticket
    - future, should: window allows removing categories and assignees
- edit all or most fields
- merge, newly merged ticket has count for the amount of requests merged
- Verify the merged draft ticket and its fields on Admin Dashboard, maybe: Admin Reports
- Verify from the users of the merged requests that they now have the merge ticket and not the original tickets
    - wtf happens with the original tokens after merging? 
- optional: create 2 tickets similar to the merged ticket, merge the two, then merge the two merged together
    - validate
```

## Promoting Draft to New Ticket
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- optional: change to another admin
- Have 3 draft tickets promoted
    - check that the fields remain unchanged during promotion
    - verify from users
    - Audit trail shows the tickets are promoted from draft along with being edited during draft
    - Assignees should only see the tickets they were assigned to by admins
```

### Future: Assignee Reassignment
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- Yea reassign to any other assignee, audit log marks this event
- users check the assignees of the changed tickets
- The new Assignee gets "a notification", email?
```

### Creators/Assignees Changing Ticket Statuses
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- First assignee with 2 new tickets,
    - Change status of one ticket to be something other than solved/failed
- Second assignee with 2 new tickets, one being the changed status ticket,
  the other being the third one
- All the changed tickets display old status, new status, time/date and the Assignee who did it
```

### Comments
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- Admins each comment on 1 ticket, at least 1 public comment, 1 internal comment on each ticket
- Both assignees each comment on their following tickets, some public and some internal
    - All public and internal comments of each ticket is seen
- Users comment on most of their tickets
    - should only see public comments
- Users are emailed if comments are added by the Assignees
    - Internal comments are not notified
- extra: Assignees and admins get emailed for both internal and public comments
- Check all comments once more for some tickets with assignee or admin
```

## Solved/Failed Tickets
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- Both assignees change one of their tickets to be solved or failed
    - system prompts final public comment
    - Users/Followers are notified by email that the ticket is definitive
    - Users/Followers see the tickets in final stage, both via token and login
    - Assignees and Admins see the tickets in final stage
        - Failed/Solved on the Assignees' Reports changed, workload decreased
        - Solved on Admins' Reports changed, backlog reduced,
          solved tickets increased accordingly
        - unsure: resolution recomputed
        - unsure: Admin Report categories remains unchanged
```

## Future: Admin's User Overview
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- Can promote a user to be an Assignee
- Can then add predefined scope tags/specialities to Assignees
    - Editing unmentioned so who cares for now xd
```

## Future: Splitting Draft Tickets
```
- Stretch/squeeze(to 360px width) page for testing responsive UI
- breaks one merged ticket into two
- Can group requests or draft tickets together as one from two tickets
- Maintains links to original requests forming the two tickets
- extra: should at least give IDs of the split tickets, editing window for split two tickets would be weird
```



