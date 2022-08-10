'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const aws_cdk_lib_1 = require('aws-cdk-lib')
const assertions_1 = require('aws-cdk-lib/assertions')
const carbonlake_qs_stack_1 = require('../lib/carbonlake-qs-stack')
test('Snapshot', () => {
  const app = new aws_cdk_lib_1.App()
  const stack = new carbonlake_qs_stack_1.CarbonlakeQuickstartStack(app, 'test')
  //Add your own required test outputs here
  const template = assertions_1.Template.fromStack(stack)
  template.hasOutput('APIURL', assertions_1.Match.objectLike({})) // Check to make sure the APIURL is output
  template.hasOutput('password', assertions_1.Match.objectLike({})) // Check to make sure there is password ouput
  template.hasOutput('WebAppUrl', assertions_1.Match.objectLike({})) // Check to make sure the web app outputs a url
  template.hasOutput('S3LandingZoneInputBucketARN', assertions_1.Match.objectLike({})) // Check to make sure the S3 landing zone bucket input ARN is output
  template.resourceCountIs('AWS::CloudFormation::Stack', 5)
})
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyYm9ubGFrZS1xdWlja3N0YXJ0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjYXJib25sYWtlLXF1aWNrc3RhcnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDZDQUFpQztBQUNqQyx1REFBd0Q7QUFDeEQsb0VBQXNFO0FBRXRFLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO0lBQ3BCLE1BQU0sR0FBRyxHQUFHLElBQUksaUJBQUcsRUFBRSxDQUFBO0lBQ3JCLE1BQU0sS0FBSyxHQUFHLElBQUksK0NBQXlCLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3hELHlDQUF5QztJQUN6QyxNQUFNLFFBQVEsR0FBRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMxQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxrQkFBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBLENBQUMsMENBQTBDO0lBQzdGLFFBQVEsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLGtCQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyw2Q0FBNkM7SUFDbEcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsa0JBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLCtDQUErQztJQUNyRyxRQUFRLENBQUMsU0FBUyxDQUFDLDZCQUE2QixFQUFFLGtCQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxvRUFBb0U7SUFDNUksUUFBUSxDQUFDLGVBQWUsQ0FBQyw0QkFBNEIsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMzRCxDQUFDLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCB9IGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0IHsgVGVtcGxhdGUsIE1hdGNoIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucydcbmltcG9ydCB7IENhcmJvbmxha2VRdWlja3N0YXJ0U3RhY2sgfSBmcm9tICcuLi9saWIvY2FyYm9ubGFrZS1xcy1zdGFjaydcblxudGVzdCgnU25hcHNob3QnLCAoKSA9PiB7XG4gIGNvbnN0IGFwcCA9IG5ldyBBcHAoKVxuICBjb25zdCBzdGFjayA9IG5ldyBDYXJib25sYWtlUXVpY2tzdGFydFN0YWNrKGFwcCwgJ3Rlc3QnKVxuICAvL0FkZCB5b3VyIG93biByZXF1aXJlZCB0ZXN0IG91dHB1dHMgaGVyZVxuICBjb25zdCB0ZW1wbGF0ZSA9IFRlbXBsYXRlLmZyb21TdGFjayhzdGFjaylcbiAgdGVtcGxhdGUuaGFzT3V0cHV0KCdBUElVUkwnLCBNYXRjaC5vYmplY3RMaWtlKHt9KSkgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHRoZSBBUElVUkwgaXMgb3V0cHV0XG4gIHRlbXBsYXRlLmhhc091dHB1dCgncGFzc3dvcmQnLCBNYXRjaC5vYmplY3RMaWtlKHt9KSkgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHRoZXJlIGlzIHBhc3N3b3JkIG91cHV0XG4gIHRlbXBsYXRlLmhhc091dHB1dCgnV2ViQXBwVXJsJywgTWF0Y2gub2JqZWN0TGlrZSh7fSkpIC8vIENoZWNrIHRvIG1ha2Ugc3VyZSB0aGUgd2ViIGFwcCBvdXRwdXRzIGEgdXJsXG4gIHRlbXBsYXRlLmhhc091dHB1dCgnUzNMYW5kaW5nWm9uZUlucHV0QnVja2V0QVJOJywgTWF0Y2gub2JqZWN0TGlrZSh7fSkpIC8vIENoZWNrIHRvIG1ha2Ugc3VyZSB0aGUgUzMgbGFuZGluZyB6b25lIGJ1Y2tldCBpbnB1dCBBUk4gaXMgb3V0cHV0XG4gIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpDbG91ZEZvcm1hdGlvbjo6U3RhY2snLCA1KVxufSlcbiJdfQ==
