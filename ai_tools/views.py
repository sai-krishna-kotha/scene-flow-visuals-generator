from django.shortcuts import render

def index(request):
    return render(request, "index.html")

def storyboard_detail(request, pk):
    return render(request, 'detailed_page.html', {'pk': pk})
