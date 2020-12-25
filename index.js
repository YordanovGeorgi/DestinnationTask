const auth = firebase.auth();
const DB = firebase.firestore();

const app = Sammy ('#root', function(){

    this.use('Handlebars','hbs');

    this.get('#/home', function(context){
        
        DB.collection("destinations").get()
        .then((res)=>{
            context.destinations = res.docs.map((des)=>{ return { id: des.id,...des.data()}})
            loadPartial(context)
            .then(function(){
                this.partial('./templates/home.hbs')
            })
        })
        .catch(e=>{
            errorHandler(`Error: ${e.message}`,'#/home',context)
        });
       
    })

    this.get('#/register', function(context){
        
        loadPartial(context)
        .then(function(){
            this.partial('./templates/register.hbs')
        })
    })

    this.get('#/login', function(context){
        
        loadPartial(context)
        .then(function(){
            this.partial('./templates/login.hbs')
        })
    })

    this.post('#/register',function(context){
        let { email, password, rePassword } = context.params;
       
        if(email ==""){
            let message = 'Error: email field can not be empty';
            errorHandler(message,'#/register',context);
            return;
        }
        if(password.length==0||password!==rePassword||password.length<6){
            let message;
            if(password.length==0||password.length<6){
                message = 'Error: password lenght should be atleast 6 symbols';
            }
            if(password!==rePassword){
                message ='Error: password and repeat password should be same';
            }
            errorHandler(message,'#/register',context);
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then(res=>{
                saveUserInfo(res);
                successHandler('User registration successful.','#/home',context);
            })
            .catch(e=>{
               errorHandler(`Error: ${e.message}`,'#/register',context);
            })
    })


    this.post('#/login',function(context){

        let { email, password } = context.params;
       
        if(email ==""){
            let message = 'Error: email field can not be empty';
            errorHandler(message,'#/login',context);
            return;
        }

        auth.signInWithEmailAndPassword(email, password)
            .then(res=>{
                saveUserInfo(res);
                successHandler('Login successful.','#/home',context)
            })
            .catch(e=>{
                errorHandler(`Error: ${e.message}`,'#/login',context)
            })
    })

    this.get('#/create', function(context){
        
        loadPartial(context)
        .then(function(){
            this.partial('./templates/create.hbs')
        })
    })

    this.post('#/create',function(context){
        let { destination, city, duration, departureDate, imgUrl} = context.params;
        debugger
        if(destination.length===0||city.length===0||duration.length===0||departureDate.length===0||imgUrl.length===0){
            errorHandler('Error: all fields must be filled','#/create',context);
            return;
        }
        let user = getUserInfo();
        DB.collection("destinations").add({
            destination,
            city,
            duration,
            departureDate,
            imgUrl,
            creator: user.email,
        })
        .then(res=>{
            debugger
            console.log(res);
            successHandler("Destination added successfully!",'#/home',context)
        })
        .catch(e=>{
            errorHandler(`Error: ${e.message}`,'#/create',context)
        })
    })

    this.get('#/details/:id', function(context){
       
        DB.collection('destinations')
            .doc(context.params.id)
            .get()
            .then(res=>{
                const data = res.data();
                const user = getUserInfo('user')

                let date = new Date(data.departureDate);
                let formatDate = date.getDate() + "-" + (date.toLocaleString("default", { month: "long" }))+"-"+date.getFullYear();
                debugger
                data.departureDate = formatDate;

                const isCreator = data.creator===user.email;
                context.des = {...data, isCreator, id:res.id}

                loadPartial(context)
                .then(function(){
                this.partial('./templates/details.hbs')
                });
            })
            .catch(e=>{
                errorHandler(`Error: ${e.message}`,'#/home',context)
            })
        
    })

    this.get('#/edit/:id', function(context){
        let id = context.params.id;
       
        DB.collection('destinations').doc(id).get()
            .then(res=>{
                context.des = {id, ...res.data()};

                loadPartial(context)
                .then(function(){
                    this.partial('./templates/edit.hbs')
                });
            })
            .catch(e=>{
                errorHandler(`Error: ${e.message}`,'#/home',context)
            })
        
    })

    this.post('#/edit/:id', function(context){
        let { id, destination, city, duration, departureDate, imgUrl} = context.params;

        if(destination.length===0||city.length===0||duration.length===0||departureDate.length===0||imgUrl.length===0){
            errorHandler('Error: all fields must be filled',`#/edit/${id}`,context);
            return;
        }

        const updateData = {
            destination,
            city,
            duration,
            departureDate,
            imgUrl
        };

        DB.collection('destinations').doc(id).update(updateData)
            .then(res=>{
                successHandler('Successfully edited destination.',`#/details/${id}`,context)
            })
            .catch(e=>{errorHandler(`Error: ${e.message}`,`#/edit/${id}`,context)});
    })

    this.get('#/logout',function(context){
        
        auth.signOut()
            .then(res=>{
                localStorage.removeItem('user');
                successHandler('Logout successful.','#/login',context)
            })
            .catch(e=>{
                errorHandler(`Error: ${e.message}`,'#/home',context)
            })
    })

    this.get('#/delete/:id', function(context){
        const id = context.params.id;
        debugger
        DB.collection('destinations').doc(id).delete()
            .then(res=>{
                successHandler('Destination deleted.','#/myDestinations',context)
            })
            .catch(e=>{errorHandler(`Error: ${e.message}`,'#/myDestinations',context)})
    })

    this.get('#/myDestinations',function(context){
        console.log(context);

        DB.collection("destinations").get()
        .then((res)=>{
            let user = getUserInfo();
            let test = res.docs.map((des)=>{ return { id: des.id,...des.data()}});
            context.destinations = test.filter(x=>x.creator==user.email)
            loadPartial(context)
            .then(function(){
                this.partial('./templates/dest.hbs')
            })
        })
        .catch(e=>{
            errorHandler(`Error: ${e.message}`,'#/myDestinations',context);
        });
    })
});

app.run('#/home');


function loadPartial(context){
    
    let user = getUserInfo();
        if(user){
            context.isLoggedIn = true;
            context.email = user.email;
        }
    return context.loadPartials({
        'header': './partials/header.hbs',
        'footer': './partials/footer.hbs'
    })
}

function saveUserInfo(data){
    let { email , uid } = data.user;
    localStorage.setItem('user',JSON.stringify({email,uid}));
}

function getUserInfo(){

    const user =  localStorage.getItem('user');
    return user? JSON.parse(user) : null;
}

function errorHandler(message,location,context){
    let msgElement = document.getElementById("errorBox");
    msgElement.textContent = message;
    msgElement.style.display='block';
    setTimeout(function(){
        msgElement.style.display='none';
        context.redirect(location);
    },3000)
}

function successHandler(message, location,context){
    
    let msgElement = document.getElementById("successBox");
    msgElement.textContent = message;
    msgElement.style.display='block';
    setTimeout(function(){
        msgElement.style.display='none';
        context.redirect(location);
    },3000)
}